import * as THREE from 'three';
import { EYE_COLOR_INFO } from '../data/coats';
import { LifeStage, RatAppearance, RatBehavior } from '../types/game';
import { getFurTextures, getHeadColors } from './FurTexture';

export interface RatAnimationState {
  behavior: RatBehavior;
  speed: number;
  time: number;
  headLookYaw: number;
  headLookPitch: number;
  holdingFood: boolean;
  holdingPaper: boolean;
  holdingBall: boolean;
}

/**
 * Sculpted, anatomically charming 3D fancy rat rig:
 * - Soft pear-shaped body with velvety fur grain + rex curl bump
 * - Articulated head, tapered snout, twitching pink nose, moving whiskers
 * - Natural expressive bead eyes (dark/ruby/red) with blink
 * - Standard upright OR Dumbo rounded low-set ears with soft pink interiors
 * - 4 articulated limbs with pink paws/toes
 * - 7-segment articulated flexible tail that sways naturally without floor clipping
 */
export class RatRig {
  public readonly root: THREE.Group;
  public readonly bodyPivot: THREE.Group;
  public readonly headPivot: THREE.Group;
  public readonly noseMesh: THREE.Mesh;
  public readonly whiskerGroupL: THREE.Group;
  public readonly whiskerGroupR: THREE.Group;
  public readonly earL: THREE.Group;
  public readonly earR: THREE.Group;
  public readonly eyeL: THREE.Mesh;
  public readonly eyeR: THREE.Mesh;
  public readonly legFL: THREE.Group;
  public readonly legFR: THREE.Group;
  public readonly legBL: THREE.Group;
  public readonly legBR: THREE.Group;
  public readonly tailSegments: THREE.Group[] = [];
  public readonly heldPellet: THREE.Mesh;
  public readonly heldPaper: THREE.Mesh;
  public readonly heldBall: THREE.Mesh;

  private bodyMat: THREE.MeshStandardMaterial;
  private headMat: THREE.MeshStandardMaterial;
  private snoutMat: THREE.MeshStandardMaterial;
  private earOuterMat: THREE.MeshStandardMaterial;
  private pawMat: THREE.MeshStandardMaterial;
  private eyeMat: THREE.MeshStandardMaterial;
  private headCapMesh: THREE.Mesh;

  private ratId: string;
  private blinkTimer = 2 + Math.random() * 4;
  private currentScale = 1;

  constructor(ratId: string, appearance: RatAppearance, lifeStage: LifeStage) {
    this.ratId = ratId;
    this.root = new THREE.Group();
    this.root.userData.ratId = ratId;

    this.bodyPivot = new THREE.Group();
    this.bodyPivot.position.y = 0.095;
    this.root.add(this.bodyPivot);

    const { map, bumpMap } = getFurTextures(appearance);
    const headColors = getHeadColors(appearance);
    const isRex = appearance.coatTexture === 'rex';

    this.bodyMat = new THREE.MeshStandardMaterial({
      map,
      bumpMap,
      bumpScale: isRex ? 0.012 : 0.004,
      roughness: isRex ? 0.96 : 0.88,
      metalness: 0.0,
    });

    this.headMat = new THREE.MeshStandardMaterial({
      color: headColors.headHex,
      bumpMap,
      bumpScale: isRex ? 0.01 : 0.003,
      roughness: isRex ? 0.95 : 0.88,
      metalness: 0.0,
    });

    this.snoutMat = new THREE.MeshStandardMaterial({
      color: headColors.snoutHex,
      bumpMap,
      bumpScale: 0.0025,
      roughness: 0.87,
      metalness: 0.0,
    });

    this.earOuterMat = new THREE.MeshStandardMaterial({
      color: headColors.earOuterHex,
      roughness: 0.85,
      metalness: 0.0,
    });

    const earInnerMat = new THREE.MeshStandardMaterial({
      color: '#F3C0BF',
      roughness: 0.78,
      metalness: 0.0,
    });

    this.pawMat = new THREE.MeshStandardMaterial({
      color: headColors.pawHex,
      roughness: 0.75,
      metalness: 0.0,
    });

    const noseMat = new THREE.MeshStandardMaterial({
      color: '#F4A9AE',
      roughness: 0.45,
      metalness: 0.02,
    });

    const tailMat = new THREE.MeshStandardMaterial({
      color: '#E7B7B2',
      roughness: 0.7,
      metalness: 0.0,
    });

    this.eyeMat = new THREE.MeshStandardMaterial({
      color: EYE_COLOR_INFO[appearance.eyeColor].hex,
      roughness: 0.14,
      metalness: 0.08,
    });

    // --- 1. Sculpted Organic Pear-Shaped Body (aligned along +Z forward) ---
    // LatheGeometry rotated so axis runs along Z: U wraps circumference, V goes tail->shoulders
    const bodyProfile: THREE.Vector2[] = [
      new THREE.Vector2(0.001, -0.175),
      new THREE.Vector2(0.048, -0.165),
      new THREE.Vector2(0.088, -0.125),
      new THREE.Vector2(0.106, -0.055), // plump cozy haunches
      new THREE.Vector2(0.102, 0.015),
      new THREE.Vector2(0.086, 0.075),
      new THREE.Vector2(0.068, 0.125),  // tapered shoulders
      new THREE.Vector2(0.042, 0.155),
      new THREE.Vector2(0.001, 0.165),
    ];
    const torsoGeo = new THREE.LatheGeometry(bodyProfile, 22);
    // Rotate so Y -> +Z (forward), and U=0.5 faces +Y (spine)
    torsoGeo.rotateX(Math.PI / 2);
    torsoGeo.rotateZ(Math.PI);
    // Slight organic squash (slightly wider & gently arched back)
    const posAttr = torsoGeo.attributes.position;
    for (let i = 0; i < posAttr.count; i++) {
      const x = posAttr.getX(i);
      const y = posAttr.getY(i);
      const z = posAttr.getZ(i);
      const arch = Math.cos((z / 0.17) * 1.2) * 0.014;
      const flatBelly = y < -0.04 ? y * 0.78 - 0.008 : y * 0.94;
      posAttr.setXYZ(i, x * 0.94, flatBelly + arch, z);
    }
    torsoGeo.computeVertexNormals();

    const torsoMesh = new THREE.Mesh(torsoGeo, this.bodyMat);
    torsoMesh.castShadow = true;
    torsoMesh.receiveShadow = true;
    torsoMesh.userData.ratId = ratId;
    this.bodyPivot.add(torsoMesh);

    // --- 2. Articulated Head + Snout + Nose + Eyes + Ears + Whiskers ---
    this.headPivot = new THREE.Group();
    this.headPivot.position.set(0, 0.025, 0.14);
    this.bodyPivot.add(this.headPivot);

    // Cranium
    const craniumGeo = new THREE.SphereGeometry(0.064, 18, 14);
    craniumGeo.scale(0.92, 0.88, 1.08);
    const craniumMesh = new THREE.Mesh(craniumGeo, this.headMat);
    craniumMesh.position.set(0, 0.008, 0.028);
    craniumMesh.castShadow = true;
    craniumMesh.userData.ratId = ratId;
    this.headPivot.add(craniumMesh);

    // Soft forehead "cap" overlay (visible for dorsal_stripe + headCap)
    const capGeo = new THREE.SphereGeometry(0.0655, 16, 12, 0, Math.PI * 2, 0, Math.PI * 0.56);
    capGeo.scale(0.91, 0.87, 1.06);
    this.headCapMesh = new THREE.Mesh(capGeo, this.headMat);
    this.headCapMesh.position.set(0, 0.011, 0.026);
    this.headCapMesh.visible = false;
    this.headPivot.add(this.headCapMesh);

    // Tapered soft snout
    const snoutGeo = new THREE.ConeGeometry(0.046, 0.095, 16);
    snoutGeo.rotateX(Math.PI / 2);
    snoutGeo.scale(0.95, 0.78, 1.0);
    const snoutMesh = new THREE.Mesh(snoutGeo, this.snoutMat);
    snoutMesh.position.set(0, -0.006, 0.088);
    snoutMesh.castShadow = true;
    snoutMesh.userData.ratId = ratId;
    this.headPivot.add(snoutMesh);

    // Cute soft cheeks
    const cheekGeo = new THREE.SphereGeometry(0.032, 12, 10);
    for (const side of [-1, 1]) {
      const cheek = new THREE.Mesh(cheekGeo, this.headMat);
      cheek.position.set(side * 0.032, -0.012, 0.055);
      cheek.scale.set(0.85, 0.82, 1.05);
      this.headPivot.add(cheek);
    }

    // Pink twitching nose
    const noseGeo = new THREE.SphereGeometry(0.014, 12, 10);
    noseGeo.scale(1.1, 0.85, 0.9);
    this.noseMesh = new THREE.Mesh(noseGeo, noseMat);
    this.noseMesh.position.set(0, -0.004, 0.136);
    this.headPivot.add(this.noseMesh);

    // Natural bead eyes (appropriately sized, NOT human anime eyes) + tiny light reflection
    const eyeGeo = new THREE.SphereGeometry(0.0135, 12, 10);
    const glintGeo = new THREE.SphereGeometry(0.0036, 6, 6);
    const glintMat = new THREE.MeshBasicMaterial({ color: '#FFFFFF' });

    this.eyeL = new THREE.Mesh(eyeGeo, this.eyeMat);
    this.eyeL.position.set(0.038, 0.019, 0.068);
    const glintL = new THREE.Mesh(glintGeo, glintMat);
    glintL.position.set(0.006, 0.006, 0.009);
    this.eyeL.add(glintL);
    this.headPivot.add(this.eyeL);

    this.eyeR = new THREE.Mesh(eyeGeo, this.eyeMat);
    this.eyeR.position.set(-0.038, 0.019, 0.068);
    const glintR = new THREE.Mesh(glintGeo, glintMat);
    glintR.position.set(-0.006, 0.006, 0.009);
    this.eyeR.add(glintR);
    this.headPivot.add(this.eyeR);

    // Cupped Ears (Standard vs Dumbo positioned dynamically)
    const buildEar = (side: number) => {
      const g = new THREE.Group();
      const outerGeo = new THREE.SphereGeometry(0.034, 14, 10, 0, Math.PI * 2, 0, Math.PI * 0.65);
      outerGeo.scale(0.88, 1.05, 0.42);
      const outer = new THREE.Mesh(outerGeo, this.earOuterMat);
      outer.castShadow = true;
      g.add(outer);

      const innerGeo = new THREE.SphereGeometry(0.027, 12, 8, 0, Math.PI * 2, 0, Math.PI * 0.6);
      innerGeo.scale(0.84, 0.96, 0.36);
      const inner = new THREE.Mesh(innerGeo, earInnerMat);
      inner.position.set(0, -0.002, 0.004);
      g.add(inner);

      g.userData.side = side;
      return g;
    };
    this.earL = buildEar(1);
    this.earR = buildEar(-1);
    this.headPivot.add(this.earL, this.earR);

    // Movable Delicate Whiskers (Left & Right)
    const whiskerMat = new THREE.LineBasicMaterial({ color: '#EAE2D8', transparent: true, opacity: 0.72 });
    const buildWhiskers = (side: number) => {
      const wg = new THREE.Group();
      wg.position.set(side * 0.022, -0.008, 0.112);
      const angles = [-0.28, -0.1, 0.08, 0.24];
      for (let i = 0; i < angles.length; i++) {
        const a = angles[i];
        const pts = [
          new THREE.Vector3(0, 0, 0),
          new THREE.Vector3(side * 0.045, a * 0.032, 0.008 - i * 0.004),
          new THREE.Vector3(side * 0.088, a * 0.068 - 0.006, -0.012 - i * 0.005),
        ];
        const geo = new THREE.BufferGeometry().setFromPoints(pts);
        wg.add(new THREE.Line(geo, whiskerMat));
      }
      return wg;
    };
    this.whiskerGroupL = buildWhiskers(1);
    this.whiskerGroupR = buildWhiskers(-1);
    this.headPivot.add(this.whiskerGroupL, this.whiskerGroupR);

    // --- 3. Four Cute Limbs with Tiny Paws & Toes ---
    const buildLimb = (isFront: boolean, side: number) => {
      const leg = new THREE.Group();
      const upperGeo = new THREE.CapsuleGeometry(isFront ? 0.021 : 0.028, isFront ? 0.032 : 0.038, 6, 10);
      const upper = new THREE.Mesh(upperGeo, this.bodyMat);
      upper.position.y = -0.022;
      upper.castShadow = true;
      leg.add(upper);

      const pawGeo = new THREE.SphereGeometry(isFront ? 0.017 : 0.02, 10, 8);
      pawGeo.scale(0.85, 0.45, isFront ? 1.35 : 1.75);
      const paw = new THREE.Mesh(pawGeo, this.pawMat);
      paw.position.set(0, -0.052, isFront ? 0.012 : 0.018);
      leg.add(paw);

      // Tiny toe nubs
      const toeGeo = new THREE.SphereGeometry(0.0045, 6, 6);
      for (let t = -1; t <= 1; t++) {
        const toe = new THREE.Mesh(toeGeo, this.pawMat);
        toe.position.set(t * 0.007, -0.055, (isFront ? 0.026 : 0.038));
        leg.add(toe);
      }

      leg.position.set(side * (isFront ? 0.052 : 0.064), -0.035, isFront ? 0.085 : -0.092);
      return leg;
    };

    this.legFL = buildLimb(true, 1);
    this.legFR = buildLimb(true, -1);
    this.legBL = buildLimb(false, 1);
    this.legBR = buildLimb(false, -1);
    this.bodyPivot.add(this.legFL, this.legFR, this.legBL, this.legBR);

    // --- 4. Long Flexible 7-Segment Articulated Tail ---
    let parentTail: THREE.Object3D = this.bodyPivot;
    const segCount = 7;
    const segLen = 0.048;
    for (let i = 0; i < segCount; i++) {
      const segGroup = new THREE.Group();
      if (i === 0) {
        segGroup.position.set(0, -0.018, -0.155);
      } else {
        segGroup.position.set(0, 0, -segLen);
      }
      const rStart = 0.018 * (1 - (i / segCount) * 0.72);
      const rEnd = 0.018 * (1 - ((i + 1) / segCount) * 0.76);
      const segGeo = new THREE.CylinderGeometry(rEnd, rStart, segLen * 1.08, 10);
      segGeo.rotateX(Math.PI / 2);
      const segMesh = new THREE.Mesh(segGeo, tailMat);
      segMesh.position.z = -segLen * 0.5;
      segMesh.castShadow = true;
      segGroup.add(segMesh);

      parentTail.add(segGroup);
      this.tailSegments.push(segGroup);
      parentTail = segGroup;
    }

    // --- 5. Held Props (Pellet for eating, Paper strip for nesting, Toy ball for fetch) ---
    this.heldPellet = new THREE.Mesh(
      new THREE.SphereGeometry(0.018, 10, 8),
      new THREE.MeshStandardMaterial({ color: '#9D7348', roughness: 0.9 })
    );
    this.heldPellet.scale.set(1.1, 0.85, 1.0);
    this.heldPellet.position.set(0, -0.025, 0.145);
    this.heldPellet.visible = false;
    this.bodyPivot.add(this.heldPellet);

    this.heldPaper = new THREE.Mesh(
      new THREE.BoxGeometry(0.09, 0.008, 0.022),
      new THREE.MeshStandardMaterial({ color: '#F6F0E4', roughness: 0.95 })
    );
    this.heldPaper.position.set(0, -0.012, 0.13);
    this.heldPaper.visible = false;
    this.headPivot.add(this.heldPaper);

    this.heldBall = new THREE.Mesh(
      new THREE.SphereGeometry(0.028, 12, 10),
      new THREE.MeshStandardMaterial({ color: '#E09F5A', roughness: 0.65 })
    );
    this.heldBall.position.set(0, -0.015, 0.15);
    this.heldBall.visible = false;
    this.headPivot.add(this.heldBall);

    this.applyAppearance(appearance, lifeStage);
  }

  public applyAppearance(appearance: RatAppearance, lifeStage: LifeStage): void {
    const { map, bumpMap } = getFurTextures(appearance);
    const headColors = getHeadColors(appearance);
    const isRex = appearance.coatTexture === 'rex';

    this.bodyMat.map = map;
    this.bodyMat.bumpMap = bumpMap;
    this.bodyMat.bumpScale = isRex ? 0.012 : 0.004;
    this.bodyMat.roughness = isRex ? 0.96 : 0.88;
    this.bodyMat.needsUpdate = true;

    this.headMat.color.set(headColors.headHex);
    this.headMat.bumpMap = bumpMap;
    this.headMat.bumpScale = isRex ? 0.01 : 0.003;
    this.headMat.needsUpdate = true;

    this.snoutMat.color.set(headColors.snoutHex);
    this.earOuterMat.color.set(headColors.earOuterHex);
    this.pawMat.color.set(headColors.pawHex);
    this.eyeMat.color.set(EYE_COLOR_INFO[appearance.eyeColor].hex);

    // Position ears: Standard upright vs Dumbo lower & rounder
    const isDumbo = appearance.ears === 'dumbo';
    for (const [ear, side] of [
      [this.earL, 1],
      [this.earR, -1],
    ] as [THREE.Group, number][]) {
      if (isDumbo) {
        ear.position.set(side * 0.058, 0.016, 0.015);
        ear.rotation.set(0.15, side * 0.42, -side * 0.72);
        ear.scale.set(1.26, 1.18, 1.0);
      } else {
        ear.position.set(side * 0.04, 0.056, 0.016);
        ear.rotation.set(-0.18, side * 0.25, -side * 0.22);
        ear.scale.set(0.95, 1.0, 1.0);
      }
    }

    // Life stage natural proportions
    const stageScales: Record<LifeStage, number> = {
      baby: 0.74,
      teen: 0.89,
      adult: 1.04,
      senior: 1.02,
    };
    this.currentScale = stageScales[lifeStage];
    this.root.scale.setScalar(this.currentScale);
    // Baby rats have charmingly slightly bigger heads & ears
    this.headPivot.scale.setScalar(lifeStage === 'baby' ? 1.12 : 1.0);
  }

  public update(dt: number, anim: RatAnimationState): void {
    const t = anim.time;
    const b = anim.behavior;

    // Gentle breathing
    const breath = Math.sin(t * (b.startsWith('sleep') || b === 'cuddle_sleep' ? 2.1 : 4.2)) * 0.025;
    this.bodyPivot.scale.set(1 + breath, 1 - breath * 0.5, 1);

    // Natural eye blink
    this.blinkTimer -= dt;
    let eyeScaleY = 1.0;
    if (b === 'sleep_hammock' || b === 'sleep_house' || b === 'cuddle_sleep' || b === 'enjoy_pet') {
      eyeScaleY = 0.16; // peaceful squint / closed eyes
    } else if (this.blinkTimer < 0) {
      eyeScaleY = 0.15;
      if (this.blinkTimer < -0.11) {
        this.blinkTimer = 2.5 + Math.random() * 4.5;
      }
    }
    this.eyeL.scale.y = THREE.MathUtils.lerp(this.eyeL.scale.y, eyeScaleY, Math.min(1, dt * 16));
    this.eyeR.scale.y = THREE.MathUtils.lerp(this.eyeR.scale.y, eyeScaleY, Math.min(1, dt * 16));

    // Nose twitch & whisker quiver
    const sniffRate = b === 'sniff' || b === 'approach_hand' ? 18 : b.startsWith('sleep') ? 1.5 : 9;
    const sniffAmp = b === 'sniff' || b === 'approach_hand' ? 0.0045 : b.startsWith('sleep') ? 0.0005 : 0.0022;
    this.noseMesh.position.y = -0.004 + Math.sin(t * sniffRate) * sniffAmp;
    const wQuiver = Math.sin(t * sniffRate * 1.15) * (b.startsWith('sleep') ? 0.02 : 0.14);
    this.whiskerGroupL.rotation.y = wQuiver;
    this.whiskerGroupR.rotation.y = -wQuiver;

    // Held props visibility
    this.heldPellet.visible = b === 'eat' || anim.holdingFood;
    this.heldPaper.visible = b === 'carry_nesting' || anim.holdingPaper;
    this.heldBall.visible = b === 'trick_ball' || anim.holdingBall;

    // Default neutral pose targets
    let bodyPitch = 0;
    let bodyY = 0.095;
    let bodyRoll = 0;
    let headPitch = anim.headLookPitch;
    let headYaw = anim.headLookYaw;
    let legFLX = 0;
    let legFRX = 0;
    let legBLX = 0;
    let legBRX = 0;
    let tailCurl = 0;
    let tailBasePitch = 0.08; // gently above ground so tail NEVER clips floor!

    if (b === 'walk' || b === 'climb_ramp' || b === 'tunnel_crawl' || b === 'carry_nesting' || b === 'approach_hand' || b === 'trick_ball') {
      const freq = 10.5 * Math.max(0.6, anim.speed);
      const stride = Math.sin(t * freq) * 0.58;
      legFLX = stride;
      legBRX = stride;
      legFRX = -stride;
      legBLX = -stride;
      bodyY = 0.095 + Math.abs(Math.sin(t * freq)) * 0.012;
      bodyPitch = b === 'climb_ramp' ? -0.32 : Math.sin(t * freq * 2) * 0.03;
      headYaw += Math.sin(t * 3.1) * 0.12;
    } else if (b === 'rear_up' || b === 'drink') {
      // Standing upright on hind legs!
      bodyPitch = -0.78;
      bodyY = 0.165;
      headPitch = 0.42 + Math.sin(t * 4.5) * 0.08;
      headYaw = Math.sin(t * 2.4) * 0.25;
      legFLX = -0.75 + Math.sin(t * 6) * 0.12;
      legFRX = -0.75 - Math.sin(t * 6) * 0.12;
      legBLX = 0.62;
      legBRX = 0.62;
      tailBasePitch = 0.52;
    } else if (b === 'eat') {
      // Sitting on haunches, holding pellet with front paws and nibbling!
      bodyPitch = -0.48;
      bodyY = 0.135;
      headPitch = 0.36 + Math.sin(t * 14) * 0.05;
      legFLX = -1.15 + Math.sin(t * 11) * 0.06;
      legFRX = -1.15 + Math.sin(t * 11) * 0.06;
      legBLX = 0.4;
      legBRX = 0.4;
      tailBasePitch = 0.36;
    } else if (b === 'groom_face') {
      // Washing face adorably with front paws
      bodyPitch = -0.45;
      bodyY = 0.13;
      headPitch = 0.28 + Math.sin(t * 10) * 0.1;
      legFLX = -1.45 + Math.sin(t * 13) * 0.25;
      legFRX = -1.45 + Math.cos(t * 13) * 0.25;
      legBLX = 0.35;
      legBRX = 0.35;
      tailBasePitch = 0.32;
    } else if (b === 'scratch_fur') {
      bodyRoll = 0.22;
      headYaw = -0.5;
      legBLX = -0.8 + Math.sin(t * 18) * 0.38;
    } else if (b === 'sleep_hammock' || b === 'sleep_house' || b === 'cuddle_sleep') {
      // Cozy curled-up sleeping ball
      bodyY = 0.068;
      bodyPitch = 0.06;
      headYaw = 0.55;
      headPitch = 0.26;
      legFLX = 0.55;
      legFRX = 0.55;
      legBLX = -0.45;
      legBRX = -0.45;
      tailCurl = 0.36;
      tailBasePitch = 0.04;
    } else if (b === 'enjoy_pet') {
      // Melted pancake rat enjoying scritches!
      bodyY = 0.072;
      bodyPitch = 0.04;
      headPitch = -0.1 + Math.sin(t * 5) * 0.05;
      headYaw = Math.sin(t * 2.5) * 0.12;
    } else if (b === 'play_wrestle') {
      // Playful little hops & bouncy ears
      bodyY = 0.095 + Math.abs(Math.sin(t * 11)) * 0.065;
      bodyRoll = Math.sin(t * 9) * 0.25;
      headYaw = Math.sin(t * 7) * 0.32;
      legFLX = Math.sin(t * 14) * 0.55;
      legFRX = -Math.sin(t * 14) * 0.55;
    } else if (b === 'social_groom') {
      headPitch = 0.18 + Math.sin(t * 11) * 0.08;
      headYaw = Math.sin(t * 4) * 0.18;
    } else if (b === 'trick_spin') {
      bodyY = 0.105 + Math.abs(Math.sin(t * 12)) * 0.025;
      legFLX = Math.sin(t * 14) * 0.5;
      legFRX = -Math.sin(t * 14) * 0.5;
      legBLX = -Math.sin(t * 14) * 0.5;
      legBRX = Math.sin(t * 14) * 0.5;
    } else if (b === 'sniff' || b === 'trick_target') {
      headPitch = -0.14 + Math.sin(t * 6) * 0.08;
      headYaw = Math.sin(t * 3.2) * 0.3;
    }

    const lerpK = Math.min(1, dt * 10);
    this.bodyPivot.position.y = THREE.MathUtils.lerp(this.bodyPivot.position.y, bodyY, lerpK);
    this.bodyPivot.rotation.x = THREE.MathUtils.lerp(this.bodyPivot.rotation.x, bodyPitch, lerpK);
    this.bodyPivot.rotation.z = THREE.MathUtils.lerp(this.bodyPivot.rotation.z, bodyRoll, lerpK);

    this.headPivot.rotation.x = THREE.MathUtils.lerp(this.headPivot.rotation.x, headPitch, lerpK);
    this.headPivot.rotation.y = THREE.MathUtils.lerp(this.headPivot.rotation.y, headYaw, lerpK);

    this.legFL.rotation.x = THREE.MathUtils.lerp(this.legFL.rotation.x, legFLX, lerpK);
    this.legFR.rotation.x = THREE.MathUtils.lerp(this.legFR.rotation.x, legFRX, lerpK);
    this.legBL.rotation.x = THREE.MathUtils.lerp(this.legBL.rotation.x, legBLX, lerpK);
    this.legBR.rotation.x = THREE.MathUtils.lerp(this.legBR.rotation.x, legBRX, lerpK);

    // Flexible non-clipping tail wave
    const swaySpeed = b === 'walk' ? 6.5 : b.startsWith('sleep') ? 0.6 : 2.2;
    const swayAmp = b === 'walk' ? 0.14 : b.startsWith('sleep') ? 0.01 : 0.07;
    for (let i = 0; i < this.tailSegments.length; i++) {
      const seg = this.tailSegments[i];
      const targetYaw = tailCurl > 0
        ? tailCurl
        : Math.sin(t * swaySpeed - i * 0.6) * swayAmp;
      const targetPitch = i === 0 ? tailBasePitch : -0.025;
      seg.rotation.y = THREE.MathUtils.lerp(seg.rotation.y, targetYaw, lerpK);
      seg.rotation.x = THREE.MathUtils.lerp(seg.rotation.x, targetPitch, lerpK);
    }
  }
}
