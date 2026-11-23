import * as THREE from 'three';
import { PlacedItem } from '../types/game';

/**
 * Builds detailed cozy 3D models matching the warm Scandinavian visual style of rat_assets.
 */
export function buildFurnitureMesh(item: PlacedItem): THREE.Group {
  const g = new THREE.Group();
  g.userData.itemUid = item.uid;
  g.userData.itemId = item.itemId;

  const mainColor = item.colorHex || '#6F8672';
  const woodMat = new THREE.MeshStandardMaterial({ color: '#D4B082', roughness: 0.78, metalness: 0.02 });
  const woodDarkMat = new THREE.MeshStandardMaterial({ color: '#B48E5E', roughness: 0.82 });
  const fleeceMat = new THREE.MeshStandardMaterial({ color: '#EFE5D4', roughness: 0.96 });
  const colorMat = new THREE.MeshStandardMaterial({ color: mainColor, roughness: 0.85 });
  const metalMat = new THREE.MeshStandardMaterial({ color: '#B8C2C6', roughness: 0.35, metalness: 0.75 });

  switch (item.itemId) {
    case 'wood_house': {
      const mat = new THREE.MeshStandardMaterial({ color: mainColor, roughness: 0.78 });
      // Side & back walls with cozy open front arch
      const wallBack = new THREE.Mesh(new THREE.BoxGeometry(0.46, 0.3, 0.03), mat);
      wallBack.position.set(0, 0.16, -0.2);
      wallBack.castShadow = true;
      wallBack.receiveShadow = true;
      g.add(wallBack);

      for (const side of [-1, 1]) {
        const wallS = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.3, 0.42), mat);
        wallS.position.set(side * 0.215, 0.16, 0);
        wallS.castShadow = true;
        g.add(wallS);
      }

      // Front facade with cute arched doorway (left & right pillars + top lintel)
      for (const side of [-1, 1]) {
        const pillar = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.3, 0.03), mat);
        pillar.position.set(side * 0.17, 0.16, 0.2);
        pillar.castShadow = true;
        g.add(pillar);
      }
      const lintel = new THREE.Mesh(new THREE.BoxGeometry(0.46, 0.1, 0.03), mat);
      lintel.position.set(0, 0.26, 0.2);
      g.add(lintel);

      // Pitched shingle roof
      for (const side of [-1, 1]) {
        const roof = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.028, 0.48), woodDarkMat);
        roof.position.set(side * 0.13, 0.36, 0);
        roof.rotation.z = -side * 0.56;
        roof.castShadow = true;
        roof.receiveShadow = true;
        g.add(roof);
      }

      // Cozy bedding pad inside house
      const pad = new THREE.Mesh(new THREE.BoxGeometry(0.38, 0.025, 0.34), fleeceMat);
      pad.position.set(0, 0.015, 0);
      g.add(pad);
      break;
    }

    case 'hammock': {
      // Proper U-shaped sagging cradle hammock with fluffy cream sherpa lining facing UP!
      const curveShape = new THREE.CylinderGeometry(0.28, 0.28, 0.44, 18, 1, true, Math.PI * 0.18, Math.PI * 0.64);
      curveShape.rotateZ(Math.PI / 2);
      curveShape.rotateY(Math.PI / 2);
      curveShape.rotateX(Math.PI); // Invert so the cradle sags DOWN like a real hammock!
      curveShape.scale(1.0, 0.62, 1.0);

      const outer = new THREE.Mesh(curveShape, new THREE.MeshStandardMaterial({
        color: mainColor,
        roughness: 0.92,
        side: THREE.DoubleSide,
      }));
      outer.position.y = 0.44;
      outer.castShadow = true;
      g.add(outer);

      const inner = new THREE.Mesh(curveShape.clone(), new THREE.MeshStandardMaterial({
        color: '#F3EAD9',
        roughness: 0.98,
        side: THREE.DoubleSide,
      }));
      inner.position.y = 0.448;
      inner.scale.set(0.97, 0.95, 0.97);
      g.add(inner);

      // 4 hanging straps + silver carabiners rising cleanly to the cage ceiling bars
      const strapMat = new THREE.MeshStandardMaterial({ color: mainColor, roughness: 0.9 });
      for (const sx of [-1, 1]) {
        for (const sz of [-1, 1]) {
          const strap = new THREE.Mesh(new THREE.CylinderGeometry(0.009, 0.009, 0.34, 6), strapMat);
          strap.position.set(sx * 0.22, 0.48, sz * 0.19);
          strap.rotation.z = -sx * 0.14;
          strap.rotation.x = sz * 0.1;
          g.add(strap);

          const clip = new THREE.Mesh(new THREE.TorusGeometry(0.017, 0.0045, 6, 12), metalMat);
          clip.position.set(sx * 0.24, 0.64, sz * 0.21);
          g.add(clip);
        }
      }
      break;
    }

    case 'sleeping_pouch': {
      // Cozy plush igloo / hanging pouch
      const bodyGeo = new THREE.SphereGeometry(0.22, 18, 14);
      bodyGeo.scale(1.05, 1.05, 1.0);
      const body = new THREE.Mesh(bodyGeo, colorMat);
      body.position.y = 0.2;
      body.castShadow = true;
      g.add(body);

      const rim = new THREE.Mesh(new THREE.TorusGeometry(0.11, 0.025, 10, 20), fleeceMat);
      rim.position.set(0, 0.16, 0.19);
      g.add(rim);

      const hole = new THREE.Mesh(
        new THREE.CircleGeometry(0.095, 16),
        new THREE.MeshStandardMaterial({ color: '#3E2E26', roughness: 1.0 })
      );
      hole.position.set(0, 0.16, 0.195);
      g.add(hole);
      break;
    }

    case 'tunnel': {
      const outerGeo = new THREE.CylinderGeometry(0.145, 0.145, 0.52, 18, 1, true);
      outerGeo.rotateZ(Math.PI / 2);
      const outer = new THREE.Mesh(outerGeo, new THREE.MeshStandardMaterial({
        color: mainColor,
        roughness: 0.94,
        side: THREE.DoubleSide,
      }));
      outer.position.y = 0.145;
      outer.castShadow = true;
      outer.receiveShadow = true;
      g.add(outer);

      for (const sx of [-1, 1]) {
        const ring = new THREE.Mesh(new THREE.TorusGeometry(0.145, 0.018, 8, 18), fleeceMat);
        ring.rotation.y = Math.PI / 2;
        ring.position.set(sx * 0.26, 0.145, 0);
        g.add(ring);
      }
      break;
    }

    case 'bridge': {
      // Low wide safe wooden arch bridge
      for (let i = -4; i <= 4; i++) {
        const t = i / 4;
        const plank = new THREE.Mesh(new THREE.BoxGeometry(0.055, 0.022, 0.24), i % 2 === 0 ? woodMat : woodDarkMat);
        plank.position.set(t * 0.25, 0.03 + Math.cos(t * Math.PI * 0.5) * 0.08, 0);
        plank.rotation.z = -t * 0.4;
        plank.castShadow = true;
        plank.receiveShadow = true;
        g.add(plank);
      }
      for (const sz of [-1, 1]) {
        for (const sx of [-0.22, 0, 0.22]) {
          const post = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, 0.11, 8), woodDarkMat);
          post.position.set(sx, 0.12 + (sx === 0 ? 0.04 : 0), sz * 0.11);
          g.add(post);
        }
      }
      break;
    }

    case 'shelf': {
      const board = new THREE.Mesh(new THREE.BoxGeometry(0.62, 0.035, 0.34), woodMat);
      board.position.y = 0.02;
      board.castShadow = true;
      board.receiveShadow = true;
      g.add(board);
      for (const sx of [-1, 1]) {
        const lip = new THREE.Mesh(new THREE.BoxGeometry(0.025, 0.12, 0.34), woodDarkMat);
        lip.position.set(sx * 0.3, 0.07, 0);
        g.add(lip);
      }
      break;
    }

    case 'food_bowl': {
      const ceramicMat = new THREE.MeshStandardMaterial({ color: mainColor, roughness: 0.32, metalness: 0.05 });
      const bowl = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.155, 0.085, 20), ceramicMat);
      bowl.position.y = 0.043;
      bowl.castShadow = true;
      bowl.receiveShadow = true;
      g.add(bowl);

      const innerHole = new THREE.Mesh(
        new THREE.CylinderGeometry(0.118, 0.115, 0.03, 18),
        new THREE.MeshStandardMaterial({ color: '#395553', roughness: 0.45 })
      );
      innerHole.position.y = 0.075;
      g.add(innerHole);

      // Visible food pellets / veggies inside based on fillLevel!
      const fill = item.fillLevel ?? 0;
      if (fill > 5) {
        const foodGroup = new THREE.Group();
        foodGroup.name = 'food_contents';
        const pelletCount = Math.max(4, Math.round((fill / 100) * 16));
        const pelletMat = new THREE.MeshStandardMaterial({
          color:
            item.foodKind === 'vegetables'
              ? '#5D9C49'
              : item.foodKind === 'fruit_treat'
                ? '#C8534B'
                : '#8E6841',
          roughness: 0.85,
        });
        for (let i = 0; i < pelletCount; i++) {
          const a = (i / pelletCount) * Math.PI * 2 + i * 0.7;
          const r = (i % 3) * 0.032;
          const p = new THREE.Mesh(new THREE.SphereGeometry(0.02, 8, 6), pelletMat);
          p.position.set(Math.cos(a) * r, 0.082 + (i % 2) * 0.012, Math.sin(a) * r);
          foodGroup.add(p);
        }
        g.add(foodGroup);
      }
      break;
    }

    case 'water_bottle': {
      const capMat = new THREE.MeshStandardMaterial({ color: mainColor, roughness: 0.55 });
      const glassMat = new THREE.MeshPhysicalMaterial({
        color: '#EBF6FA',
        transparent: true,
        opacity: 0.52,
        roughness: 0.12,
        metalness: 0.05,
      });
      const waterMat = new THREE.MeshStandardMaterial({
        color: '#8CD1E8',
        transparent: true,
        opacity: 0.72,
        roughness: 0.18,
      });

      const body = new THREE.Mesh(new THREE.CylinderGeometry(0.065, 0.065, 0.28, 16), glassMat);
      body.position.y = 0.34;
      g.add(body);

      const fill = Math.max(0.05, (item.fillLevel ?? 60) / 100);
      const water = new THREE.Mesh(new THREE.CylinderGeometry(0.058, 0.058, 0.24 * fill, 14), waterMat);
      water.position.y = 0.22 + 0.12 * fill;
      g.add(water);

      const capTop = new THREE.Mesh(new THREE.CylinderGeometry(0.068, 0.068, 0.04, 16), capMat);
      capTop.position.y = 0.49;
      g.add(capTop);

      const capBot = new THREE.Mesh(new THREE.CylinderGeometry(0.068, 0.055, 0.05, 16), capMat);
      capBot.position.y = 0.19;
      g.add(capBot);

      // Steel drinking spout pointing inside the cage (-X)
      const spout = new THREE.Mesh(new THREE.CylinderGeometry(0.011, 0.011, 0.14, 10), metalMat);
      spout.position.set(-0.05, 0.14, 0);
      spout.rotation.z = -0.95;
      g.add(spout);
      break;
    }

    case 'foraging_box': {
      const boxMat = new THREE.MeshStandardMaterial({ color: '#B8946B', roughness: 0.92 });
      const base = new THREE.Mesh(new THREE.BoxGeometry(0.38, 0.16, 0.3), boxMat);
      base.position.y = 0.08;
      base.castShadow = true;
      base.receiveShadow = true;
      g.add(base);

      // Paper shreds & cozy foraging puffs on top
      for (let i = 0; i < 14; i++) {
        const shred = new THREE.Mesh(
          new THREE.BoxGeometry(0.07, 0.015, 0.028),
          i % 3 === 0 ? colorMat : fleeceMat
        );
        shred.position.set(
          ((i * 37) % 10 - 5) * 0.028,
          0.165 + (i % 3) * 0.008,
          ((i * 53) % 10 - 5) * 0.02
        );
        shred.rotation.set((i % 4) * 0.2, i * 0.7, (i % 3) * 0.18);
        g.add(shred);
      }
      break;
    }

    case 'puzzle_feeder': {
      const board = new THREE.Mesh(new THREE.BoxGeometry(0.44, 0.065, 0.2), woodMat);
      board.position.y = 0.032;
      board.castShadow = true;
      g.add(board);
      for (const sx of [-0.13, 0, 0.13]) {
        const lid = new THREE.Mesh(new THREE.CylinderGeometry(0.055, 0.055, 0.02, 16), woodDarkMat);
        lid.position.set(sx, 0.072, 0);
        g.add(lid);
        const knob = new THREE.Mesh(new THREE.SphereGeometry(0.015, 8, 8), woodMat);
        knob.position.set(sx, 0.09, 0);
        g.add(knob);
      }
      break;
    }

    case 'chew_sticks': {
      const barkMat = new THREE.MeshStandardMaterial({ color: '#9C7B56', roughness: 0.95 });
      const offsets = [
        [0, 0.02, -0.04, 0.15],
        [0.02, 0.02, 0.01, -0.12],
        [-0.01, 0.02, 0.05, 0.08],
        [0, 0.052, -0.01, -0.05],
      ];
      for (const [ox, oy, oz, rot] of offsets) {
        const stick = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.019, 0.26, 10), barkMat);
        stick.rotation.z = Math.PI / 2;
        stick.rotation.y = rot;
        stick.position.set(ox, oy, oz);
        stick.castShadow = true;
        g.add(stick);
      }
      break;
    }

    case 'nesting_paper': {
      for (let i = 0; i < 12; i++) {
        const strip = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.008, 0.024), fleeceMat);
        const a = (i / 12) * Math.PI * 2;
        strip.position.set(Math.cos(a) * 0.045, 0.018 + (i % 4) * 0.012, Math.sin(a) * 0.045);
        strip.rotation.set(0.12 * (i % 3), a + 0.5, 0.15 * ((i % 2) * 2 - 1));
        g.add(strip);
      }
      break;
    }

    case 'litter_tray': {
      const trayMat = new THREE.MeshStandardMaterial({ color: mainColor, roughness: 0.65 });
      const base = new THREE.Mesh(new THREE.BoxGeometry(0.36, 0.08, 0.3), trayMat);
      base.position.y = 0.04;
      base.castShadow = true;
      g.add(base);
      const pellets = new THREE.Mesh(
        new THREE.BoxGeometry(0.31, 0.03, 0.25),
        new THREE.MeshStandardMaterial({ color: '#D7CDBF', roughness: 0.98 })
      );
      pellets.position.y = 0.072;
      g.add(pellets);
      break;
    }

    case 'safe_wheel': {
      // Extra-large solid-track safe wheel (never forces curved spine!)
      const wheelMat = new THREE.MeshStandardMaterial({ color: mainColor, roughness: 0.6, side: THREE.DoubleSide });
      const stand = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.03, 0.22), woodDarkMat);
      stand.position.y = 0.015;
      g.add(stand);

      const post = new THREE.Mesh(new THREE.CylinderGeometry(0.022, 0.028, 0.28, 10), metalMat);
      post.position.set(0, 0.15, -0.09);
      g.add(post);

      const drum = new THREE.Mesh(new THREE.CylinderGeometry(0.24, 0.24, 0.14, 24, 1, true), wheelMat);
      drum.rotation.x = Math.PI / 2;
      drum.position.set(0, 0.27, 0);
      drum.castShadow = true;
      g.add(drum);

      const backDisk = new THREE.Mesh(new THREE.CircleGeometry(0.24, 24), wheelMat);
      backDisk.position.set(0, 0.27, -0.07);
      g.add(backDisk);
      break;
    }
  }

  return g;
}

/**
 * Cozy sage-and-cream ventilated carrier with animated hinged lid (for cutscene & cleaning mode)
 */
export function buildCarrierMesh(): { group: THREE.Group; lidPivot: THREE.Group } {
  const group = new THREE.Group();
  const creamMat = new THREE.MeshStandardMaterial({ color: '#E3D7C5', roughness: 0.62 });
  const sageMat = new THREE.MeshStandardMaterial({ color: '#6F8672', roughness: 0.58 });
  const sherpaMat = new THREE.MeshStandardMaterial({ color: '#EFE5D4', roughness: 0.98 });

  // Base tub
  const base = new THREE.Mesh(new THREE.BoxGeometry(0.76, 0.26, 0.52), creamMat);
  base.position.y = 0.13;
  base.castShadow = true;
  base.receiveShadow = true;
  group.add(base);

  // Soft cream liner visible inside
  const liner = new THREE.Mesh(new THREE.BoxGeometry(0.68, 0.06, 0.44), sherpaMat);
  liner.position.y = 0.24;
  group.add(liner);

  // Sage rim
  const rim = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.05, 0.56), sageMat);
  rim.position.y = 0.27;
  group.add(rim);

  // Hinged top lid
  const lidPivot = new THREE.Group();
  lidPivot.position.set(0, 0.295, -0.27);
  group.add(lidPivot);

  const lid = new THREE.Mesh(new THREE.BoxGeometry(0.78, 0.08, 0.54), sageMat);
  lid.position.set(0, 0.04, 0.27);
  lid.castShadow = true;
  lidPivot.add(lid);

  const handle = new THREE.Mesh(new THREE.TorusGeometry(0.08, 0.015, 8, 16, Math.PI), sageMat);
  handle.position.set(0, 0.08, 0.27);
  lidPivot.add(handle);

  return { group, lidPivot };
}
