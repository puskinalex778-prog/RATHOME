import * as THREE from 'three';
import { FURNITURE_CATALOG, ROOM_THEMES } from '../data/catalog';
import { PERSONALITIES } from '../data/coats';
import {
  ActiveZone,
  FurnitureItemId,
  GameSettings,
  PlacedItem,
  RatBehavior,
  RatEntity,
  RoomThemeId,
} from '../types/game';
import { buildCarrierMesh, buildFurnitureMesh } from './FurnitureMeshes';
import { RatRig } from './RatMesh';

export interface RatScreenLabel {
  id: string;
  name: string;
  x: number;
  y: number;
  visible: boolean;
  behaviorLabel: string;
}

export interface DecorPreviewSpec {
  itemId: FurnitureItemId;
  zone: ActiveZone;
  level: number;
  x: number;
  z: number;
  rotation: number;
  colorHex: string;
  valid: boolean;
}

interface RatSimAgent {
  ratId: string;
  rig: RatRig;
  level: number;
  x: number;
  y: number;
  z: number;
  yaw: number;
  targetX: number;
  targetZ: number;
  targetLevel: number;
  behavior: RatBehavior;
  timer: number;
  speed: number;
  climbingRamp: boolean;
  rampProgress: number;
  rampFromLevel: number;
  rampToLevel: number;
  restSpotUid?: string;
  partnerId?: string;
  spinRemaining: number;
}

interface FloatingParticle {
  mesh: THREE.Mesh;
  vy: number;
  life: number;
  maxLife: number;
}

export interface CageSceneCallbacks {
  onSelectRat: (ratId: string) => void;
  onPetStroke: (ratId: string) => void;
  onVoluntaryApproach: (ratId: string) => void;
  onLabelsUpdate: (labels: RatScreenLabel[]) => void;
  onBehaviorChange?: (ratId: string, behavior: RatBehavior, statusText: string) => void;
}

const BEHAVIOR_RU: Record<RatBehavior, string> = {
  idle: 'Осматривается',
  walk: 'Гуляет',
  sniff: 'Обнюхивает',
  rear_up: 'Стоит на задних лапках',
  groom_face: 'Умывает мордочку',
  scratch_fur: 'Вычёсывает шёрстку',
  eat: 'Кушает лапками',
  drink: 'Пьёт водичку',
  carry_nesting: 'Несёт бумажку в гнездо',
  climb_ramp: 'Поднимается по лесенке',
  tunnel_crawl: 'Пролезает через туннель',
  sleep_hammock: 'Спит в гамаке',
  sleep_house: 'Дремлет в домике',
  cuddle_sleep: 'Спит вместе с другом',
  social_groom: 'Ухаживает за другом',
  play_wrestle: 'Дружески резвится',
  tension: 'Нужно немного личного пространства',
  approach_hand: 'Подходит к ладони',
  enjoy_pet: 'Наслаждается поглаживанием',
  trick_spin: 'Крутится волчком!',
  trick_target: 'Касается мишени носом!',
  trick_ball: 'Несёт мячик!',
};

export const LEVEL_Y: Record<number, number> = {
  0: 0.24,  // Inside deep tray on soft bedding
  1: 1.08,  // First birch shelf
  2: 1.88,  // Second birch shelf (3-level cage)
};

export class CageScene {
  private container: HTMLElement;
  private renderer: THREE.WebGLRenderer;
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private callbacks: CageSceneCallbacks;

  private roomGroup = new THREE.Group();
  private cageGroup = new THREE.Group();
  private playpenGroup = new THREE.Group();
  private furnitureGroup = new THREE.Group();
  private ratsGroup = new THREE.Group();
  private effectsGroup = new THREE.Group();
  private carrierObj: { group: THREE.Group; lidPivot: THREE.Group };
  private handGroup: THREE.Group;
  private previewGroup: THREE.Group | null = null;

  private agents = new Map<string, RatSimAgent>();
  private ratDataMap = new Map<string, RatEntity>();
  private placedItems: PlacedItem[] = [];
  private particles: FloatingParticle[] = [];

  private activeZone: ActiveZone = 'cage';
  private habitatLevel: 2 | 3 = 2;
  private themeId: RoomThemeId = 'scandinavian';
  private selectedRatId: string | null = null;
  private followRatId: string | null = null;
  private petMode = false;
  private cleaningMode = false;
  private handOffered = false;
  private handOfferTimer = 0;

  // Cutscene playback
  private cutsceneActive = false;
  private cutsceneTime = 0;

  // Orbit camera spherical state
  private camTarget = new THREE.Vector3(0, 0.9, 0);
  private desiredTarget = new THREE.Vector3(0, 0.9, 0);
  private camAzimuth = 0.28;
  private camPolar = 1.18;
  private camRadius = 3.85;
  private desiredRadius = 3.85;
  private desiredPolar = 1.18;
  private desiredAzimuth = 0.28;

  // Pointer & touch handling
  private pointers = new Map<number, { x: number; y: number }>();
  private lastPointerX = 0;
  private lastPointerY = 0;
  private pointerDownX = 0;
  private pointerDownY = 0;
  private isDragging = false;
  private lastPinchDist = 0;
  private lastPetStrokeAt = 0;
  private raycaster = new THREE.Raycaster();

  // Loop & performance
  private rafId = 0;
  private lastFrameMs = 0;
  private fpsLimit: 30 | 60 = 30;
  private paused = false;
  private elapsed = 0;
  private labelTick = 0;

  private ambientLight!: THREE.HemisphereLight;
  private sunLight!: THREE.DirectionalLight;

  constructor(container: HTMLElement, callbacks: CageSceneCallbacks) {
    this.container = container;
    this.callbacks = callbacks;

    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color('#EFE4D4');

    const w = Math.max(320, container.clientWidth);
    const h = Math.max(320, container.clientHeight);
    this.camera = new THREE.PerspectiveCamera(42, w / h, 0.1, 40);

    this.renderer = new THREE.WebGLRenderer({
      antialias: true,
      preserveDrawingBuffer: true, // needed for Photo Mode screenshots!
      powerPreference: 'high-performance',
    });
    this.renderer.setSize(w, h);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.08;

    container.appendChild(this.renderer.domElement);

    this.setupLights();
    this.scene.add(this.roomGroup);
    this.scene.add(this.cageGroup);
    this.scene.add(this.playpenGroup);
    this.scene.add(this.furnitureGroup);
    this.scene.add(this.ratsGroup);
    this.scene.add(this.effectsGroup);

    this.carrierObj = buildCarrierMesh();
    this.carrierObj.group.position.set(-1.95, 0, 0.55);
    this.carrierObj.group.rotation.y = 0.52;
    this.carrierObj.group.visible = false;
    this.scene.add(this.carrierObj.group);

    this.handGroup = this.buildStylizedHand();
    this.handGroup.visible = false;
    this.scene.add(this.handGroup);

    this.rebuildRoom();
    this.rebuildCage();
    this.rebuildPlaypen();
    this.bindEvents();

    this.lastFrameMs = performance.now();
    this.loop(this.lastFrameMs);
  }

  private setupLights(): void {
    this.ambientLight = new THREE.HemisphereLight('#FFF8EE', '#B89B7A', 1.15);
    this.scene.add(this.ambientLight);

    this.sunLight = new THREE.DirectionalLight('#FFF3DC', 1.45);
    this.sunLight.position.set(-4.2, 6.2, 4.4);
    this.sunLight.castShadow = true;
    this.sunLight.shadow.mapSize.set(1024, 1024);
    this.sunLight.shadow.camera.near = 1;
    this.sunLight.shadow.camera.far = 18;
    const d = 3.6;
    this.sunLight.shadow.camera.left = -d;
    this.sunLight.shadow.camera.right = d;
    this.sunLight.shadow.camera.top = d;
    this.sunLight.shadow.camera.bottom = -d;
    this.sunLight.shadow.bias = -0.0005;
    this.scene.add(this.sunLight);

    const fill = new THREE.DirectionalLight('#DDEBF0', 0.45);
    fill.position.set(4, 3, -3);
    this.scene.add(fill);
  }

  private buildStylizedHand(): THREE.Group {
    const g = new THREE.Group();
    const skinMat = new THREE.MeshStandardMaterial({ color: '#F0C7AE', roughness: 0.72 });
    const palm = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.045, 0.24), skinMat);
    palm.castShadow = true;
    g.add(palm);
    for (let i = -1.5; i <= 1.5; i++) {
      const f = new THREE.Mesh(new THREE.CapsuleGeometry(0.022, 0.12, 4, 8), skinMat);
      f.rotation.x = Math.PI / 2;
      f.position.set(i * 0.052, 0.005, -0.17);
      g.add(f);
    }
    const thumb = new THREE.Mesh(new THREE.CapsuleGeometry(0.024, 0.09, 4, 8), skinMat);
    thumb.rotation.set(Math.PI / 2, 0, -0.65);
    thumb.position.set(0.14, 0.005, -0.04);
    g.add(thumb);
    // Tiny yummy treat sitting on palm
    const treat = new THREE.Mesh(
      new THREE.SphereGeometry(0.022, 8, 8),
      new THREE.MeshStandardMaterial({ color: '#9D7348', roughness: 0.85 })
    );
    treat.position.set(0, 0.04, -0.04);
    g.add(treat);
    return g;
  }

  private clearGroup(g: THREE.Group): void {
    while (g.children.length > 0) {
      g.remove(g.children[0]);
    }
  }

  private rebuildRoom(): void {
    this.clearGroup(this.roomGroup);
    const theme = ROOM_THEMES[this.themeId];
    this.scene.background = new THREE.Color(theme.wallColor);
    this.ambientLight.color.set(theme.ambientTint);

    // Warm wooden floor
    const floor = new THREE.Mesh(
      new THREE.PlaneGeometry(18, 16),
      new THREE.MeshStandardMaterial({ color: theme.floorColor, roughness: 0.72 })
    );
    floor.rotation.x = -Math.PI / 2;
    floor.position.y = -0.01;
    floor.receiveShadow = true;
    this.roomGroup.add(floor);

    // Back cozy wall
    const backWall = new THREE.Mesh(
      new THREE.PlaneGeometry(18, 9),
      new THREE.MeshStandardMaterial({ color: theme.wallColor, roughness: 0.92 })
    );
    backWall.position.set(0, 4.2, -3.4);
    backWall.receiveShadow = true;
    this.roomGroup.add(backWall);

    // Sage / themed baseboard
    const baseboard = new THREE.Mesh(
      new THREE.BoxGeometry(18, 0.24, 0.06),
      new THREE.MeshStandardMaterial({ color: theme.baseboardColor, roughness: 0.78 })
    );
    baseboard.position.set(0, 0.11, -3.37);
    this.roomGroup.add(baseboard);

    // Warm dedication plaque on the back wall ("Посвящается: Тимме, Жоржу, Васе, Элвину")
    const frameMat = new THREE.MeshStandardMaterial({ color: '#C89E6E', roughness: 0.72 });
    const plaqueW = 1.68;
    const plaqueH = 1.33;
    const frame = new THREE.Mesh(new THREE.BoxGeometry(plaqueW + 0.08, plaqueH + 0.08, 0.055), frameMat);
    frame.position.set(0, 2.35, -3.35);
    frame.castShadow = true;
    this.roomGroup.add(frame);

    const texLoader = new THREE.TextureLoader();
    const plaqueTex = texLoader.load('./assets/dedication_plaque.png');
    plaqueTex.colorSpace = THREE.SRGBColorSpace;
    const canvas = new THREE.Mesh(
      new THREE.PlaneGeometry(plaqueW, plaqueH),
      new THREE.MeshStandardMaterial({
        map: plaqueTex,
        roughness: 0.88,
        metalness: 0.0,
        transparent: true,
      })
    );
    canvas.position.set(0, 2.35, -3.318);
    this.roomGroup.add(canvas);

    // Cozy wall shelf + ceramic pot
    const wallShelf = new THREE.Mesh(new THREE.BoxGeometry(2.0, 0.08, 0.34), frameMat);
    wallShelf.position.set(2.2, 2.4, -3.22);
    this.roomGroup.add(wallShelf);

    const pot = new THREE.Mesh(
      new THREE.CylinderGeometry(0.14, 0.11, 0.22, 14),
      new THREE.MeshStandardMaterial({ color: theme.accentColor, roughness: 0.65 })
    );
    pot.position.set(1.65, 2.55, -3.2);
    this.roomGroup.add(pot);

    // Theme-specific cute accent (stars for space, warm lantern for autumn, etc.)
    if (this.themeId === 'space_station') {
      const starMat = new THREE.MeshBasicMaterial({ color: '#FFF5CC' });
      for (let i = 0; i < 18; i++) {
        const star = new THREE.Mesh(new THREE.SphereGeometry(0.035, 6, 6), starMat);
        star.position.set(-5 + (i * 1.37) % 10, 1.5 + (i * 0.73) % 3, -3.32);
        this.roomGroup.add(star);
      }
    }

    // Soft woven rug underneath habitat
    const rug = new THREE.Mesh(
      new THREE.CylinderGeometry(2.3, 2.3, 0.02, 32),
      new THREE.MeshStandardMaterial({ color: '#DFD2BE', roughness: 0.96 })
    );
    rug.position.set(0, 0.005, 0.1);
    rug.receiveShadow = true;
    this.roomGroup.add(rug);
  }

  private rebuildCage(): void {
    this.clearGroup(this.cageGroup);
    const theme = ROOM_THEMES[this.themeId];
    const barMat = new THREE.MeshStandardMaterial({ color: theme.cageBarColor, roughness: 0.45, metalness: 0.35 });
    const trayMat = new THREE.MeshStandardMaterial({ color: theme.cageTrayColor, roughness: 0.65 });
    const woodMat = new THREE.MeshStandardMaterial({ color: '#DEC094', roughness: 0.76 });
    const beddingMat = new THREE.MeshStandardMaterial({ color: '#EFE5D6', roughness: 0.98 });

    const W = 2.55;
    const D = 1.48;
    const H = this.habitatLevel === 3 ? 2.65 : 1.88;

    // Deep safe base tray (protects against bedding spill & drafts)
    const tray = new THREE.Mesh(new THREE.BoxGeometry(W + 0.08, 0.28, D + 0.08), trayMat);
    tray.position.set(0, 0.14, 0);
    tray.castShadow = true;
    tray.receiveShadow = true;
    this.cageGroup.add(tray);

    // Soft paper bedding surface inside tray (y = 0.24)
    const bedding = new THREE.Mesh(new THREE.BoxGeometry(W - 0.06, 0.05, D - 0.06), beddingMat);
    bedding.position.set(0, 0.22, 0);
    bedding.receiveShadow = true;
    this.cageGroup.add(bedding);

    // Corner frame posts
    for (const sx of [-1, 1]) {
      for (const sz of [-1, 1]) {
        const post = new THREE.Mesh(new THREE.CylinderGeometry(0.022, 0.022, H - 0.22, 10), barMat);
        post.position.set(sx * (W / 2), 0.24 + (H - 0.22) / 2, sz * (D / 2));
        post.castShadow = true;
        this.cageGroup.add(post);
      }
    }

    // Top rim frame
    const topFront = new THREE.Mesh(new THREE.BoxGeometry(W, 0.032, 0.032), barMat);
    topFront.position.set(0, H, D / 2);
    const topBack = topFront.clone();
    topBack.position.z = -D / 2;
    const topL = new THREE.Mesh(new THREE.BoxGeometry(0.032, 0.032, D), barMat);
    topL.position.set(-W / 2, H, 0);
    const topR = topL.clone();
    topR.position.x = W / 2;
    this.cageGroup.add(topFront, topBack, topL, topR);

    // Ventilated horizontal & vertical bars on BACK, LEFT, RIGHT, and TOP (front kept unobstructed for clear viewing!)
    const barRadius = 0.0065;
    const hCount = Math.floor((H - 0.3) / 0.11);
    for (let i = 1; i <= hCount; i++) {
      const y = 0.28 + i * 0.11;
      if (y >= H - 0.03) break;
      const bBack = new THREE.Mesh(new THREE.CylinderGeometry(barRadius, barRadius, W, 6), barMat);
      bBack.rotation.z = Math.PI / 2;
      bBack.position.set(0, y, -D / 2);
      this.cageGroup.add(bBack);

      for (const sx of [-1, 1]) {
        const bSide = new THREE.Mesh(new THREE.CylinderGeometry(barRadius, barRadius, D, 6), barMat);
        bSide.rotation.x = Math.PI / 2;
        bSide.position.set(sx * (W / 2), y, 0);
        this.cageGroup.add(bSide);
      }
    }

    // Subtle open front side-frame accents + openable front door hinge on lower front
    for (const sx of [-1, 1]) {
      const vBar = new THREE.Mesh(new THREE.CylinderGeometry(0.011, 0.011, H - 0.26, 8), barMat);
      vBar.position.set(sx * (W / 2 - 0.02), 0.24 + (H - 0.26) / 2, D / 2);
      this.cageGroup.add(vBar);
    }

    // Roof bars
    for (let i = -5; i <= 5; i++) {
      const rBar = new THREE.Mesh(new THREE.CylinderGeometry(barRadius, barRadius, D, 6), barMat);
      rBar.rotation.x = Math.PI / 2;
      rBar.position.set((i / 5.5) * (W / 2), H, 0);
      this.cageGroup.add(rBar);
    }

    // --- Level 1 Solid Safe Birch Shelf (recessed slightly at front so the ramp lands cleanly on the front edge!) ---
    const shelf1Depth = D - 0.54;
    const shelf1Z = -D / 2 + shelf1Depth / 2 + 0.04;
    const shelf1FrontZ = shelf1Z + shelf1Depth / 2;
    const shelf1 = new THREE.Mesh(new THREE.BoxGeometry(W - 0.08, 0.055, shelf1Depth), woodMat);
    shelf1.position.set(0, LEVEL_Y[1] - 0.028, shelf1Z);
    shelf1.castShadow = true;
    shelf1.receiveShadow = true;
    this.cageGroup.add(shelf1);

    // Wide safe solid wooden ramp from Level 0 front floor -> Level 1 front edge (zero clipping!)
    this.addSafeRamp(this.cageGroup, 0.42, LEVEL_Y[0], 0.56, 0.42, LEVEL_Y[1], shelf1FrontZ - 0.02, woodMat);

    // --- Level 2 Solid Birch Shelf (3-Level Cage Upgrade!) ---
    if (this.habitatLevel === 3) {
      const shelf2Depth = D - 0.58;
      const shelf2Z = -D / 2 + shelf2Depth / 2 + 0.04;
      const shelf2FrontZ = shelf2Z + shelf2Depth / 2;
      const shelf2 = new THREE.Mesh(new THREE.BoxGeometry(W - 0.08, 0.055, shelf2Depth), woodMat);
      shelf2.position.set(0, LEVEL_Y[2] - 0.028, shelf2Z);
      shelf2.castShadow = true;
      shelf2.receiveShadow = true;
      this.cageGroup.add(shelf2);

      this.addSafeRamp(this.cageGroup, -0.45, LEVEL_Y[1], shelf1FrontZ - 0.04, -0.45, LEVEL_Y[2], shelf2FrontZ - 0.02, woodMat);
    }
  }

  private addSafeRamp(
    parent: THREE.Group,
    x1: number,
    y1: number,
    z1: number,
    x2: number,
    y2: number,
    z2: number,
    mat: THREE.Material
  ): void {
    const start = new THREE.Vector3(x1, y1, z1);
    const end = new THREE.Vector3(x2, y2, z2);
    const diff = end.clone().sub(start);
    const len = diff.length();

    const ramp = new THREE.Group();
    ramp.position.copy(start).add(end).multiplyScalar(0.5);
    ramp.lookAt(end);

    const board = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.032, len), mat);
    board.castShadow = true;
    board.receiveShadow = true;
    ramp.add(board);

    // Anti-slip traction wooden rungs
    const rungMat = new THREE.MeshStandardMaterial({ color: '#B48E5E', roughness: 0.85 });
    const count = 8;
    for (let i = 1; i < count; i++) {
      const rung = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.018, 0.025), rungMat);
      rung.position.set(0, 0.02, -len / 2 + (i / count) * len);
      ramp.add(rung);
    }
    parent.add(ramp);
  }

  private rebuildPlaypen(): void {
    this.clearGroup(this.playpenGroup);
    const theme = ROOM_THEMES[this.themeId];
    const panelMat = new THREE.MeshStandardMaterial({ color: theme.cageBarColor, roughness: 0.62 });
    const fleeceMat = new THREE.MeshStandardMaterial({ color: '#EFE5D3', roughness: 0.98 });

    // Cozy soft fleece floor pad (zero wires, zero gaps, zero hazards!)
    const pad = new THREE.Mesh(new THREE.CylinderGeometry(1.78, 1.8, 0.05, 8), fleeceMat);
    pad.position.y = 0.025;
    pad.receiveShadow = true;
    this.playpenGroup.add(pad);

    // 8 protective solid sage panels forming an enclosed safe playpen
    const sides = 8;
    const radius = 1.72;
    for (let i = 0; i < sides; i++) {
      const a = (i / sides) * Math.PI * 2 + Math.PI / 8;
      const isFrontGate = i === 1;
      const panelH = isFrontGate ? 0.36 : 0.64;
      const panel = new THREE.Mesh(new THREE.BoxGeometry(1.38, panelH, 0.06), panelMat);
      panel.position.set(Math.sin(a) * radius, panelH / 2, Math.cos(a) * radius);
      panel.rotation.y = a;
      panel.castShadow = true;
      panel.receiveShadow = true;
      this.playpenGroup.add(panel);
    }

    this.playpenGroup.visible = this.activeZone === 'playpen';
  }

  public syncState(params: {
    rats: RatEntity[];
    placedItems: PlacedItem[];
    activeZone: ActiveZone;
    habitatLevel: 2 | 3;
    theme: RoomThemeId;
    selectedRatId: string | null;
    settings: GameSettings;
  }): void {
    const zoneChanged = this.activeZone !== params.activeZone;
    const levelChanged = this.habitatLevel !== params.habitatLevel;
    const themeChanged = this.themeId !== params.theme;

    this.activeZone = params.activeZone;
    this.habitatLevel = params.habitatLevel;
    this.themeId = params.theme;
    this.selectedRatId = params.selectedRatId;
    this.placedItems = params.placedItems;
    this.fpsLimit = params.settings.fpsLimit;

    // Quality tuning for Android
    const pr =
      params.settings.graphicsQuality === 'low'
        ? 1.0
        : params.settings.graphicsQuality === 'medium'
          ? Math.min(window.devicePixelRatio || 1, 1.5)
          : Math.min(window.devicePixelRatio || 1, 2.0);
    this.renderer.setPixelRatio(pr);
    this.renderer.shadowMap.enabled = params.settings.graphicsQuality !== 'low';

    if (themeChanged) {
      this.rebuildRoom();
      this.rebuildCage();
      this.rebuildPlaypen();
    } else if (levelChanged) {
      this.rebuildCage();
    }

    if (zoneChanged) {
      this.cageGroup.visible = this.activeZone === 'cage';
      this.playpenGroup.visible = this.activeZone === 'playpen';
      this.desiredTarget.set(0, this.activeZone === 'playpen' ? 0.35 : 0.95, 0);
      this.desiredRadius = this.activeZone === 'playpen' ? 4.2 : this.habitatLevel === 3 ? 4.5 : 3.85;
      // Reset agent positions cleanly into new zone
      for (const ag of this.agents.values()) {
        ag.level = 0;
        ag.climbingRamp = false;
        ag.x = (Math.random() - 0.5) * 1.1;
        ag.z = (Math.random() - 0.5) * 0.7;
        ag.y = this.activeZone === 'playpen' ? 0.05 : LEVEL_Y[0];
      }
    } else {
      this.cageGroup.visible = this.activeZone === 'cage';
      this.playpenGroup.visible = this.activeZone === 'playpen';
    }

    this.syncFurniture();
    this.syncRats(params.rats);
  }

  private syncFurniture(): void {
    this.clearGroup(this.furnitureGroup);
    const items = this.placedItems.filter((i) => i.zone === this.activeZone);
    for (const it of items) {
      const mesh = buildFurnitureMesh(it);
      let y = this.activeZone === 'playpen' ? 0.05 : LEVEL_Y[it.level] ?? LEVEL_Y[0];
      if (it.itemId === 'hammock' && this.activeZone === 'cage') {
        // Suspended cleanly from cage roof (or underside of upper level)
        const ceilingY = this.habitatLevel === 3 && it.level === 1 ? LEVEL_Y[2] : (this.habitatLevel === 3 ? 2.65 : 1.88);
        y = ceilingY - 0.64;
      }
      mesh.position.set(it.x, y, it.z);
      mesh.rotation.y = it.rotation;
      this.furnitureGroup.add(mesh);
    }
  }

  private syncRats(rats: RatEntity[]): void {
    const incomingIds = new Set(rats.map((r) => r.id));

    // Remove departed rats
    for (const [id, ag] of this.agents.entries()) {
      if (!incomingIds.has(id)) {
        this.ratsGroup.remove(ag.rig.root);
        this.agents.delete(id);
        this.ratDataMap.delete(id);
      }
    }

    // Add or update rats
    rats.forEach((rat, index) => {
      this.ratDataMap.set(rat.id, rat);
      const existing = this.agents.get(rat.id);
      if (existing) {
        existing.rig.applyAppearance(rat.appearance, rat.lifeStage);
      } else {
        const rig = new RatRig(rat.id, rat.appearance, rat.lifeStage);
        const startLevel = this.activeZone === 'cage' && index % 2 === 1 ? 1 : 0;
        const startX = index % 2 === 0 ? -0.45 : 0.35;
        const startZ = index % 2 === 0 ? 0.15 : -0.05;
        const startY = this.activeZone === 'playpen' ? 0.05 : LEVEL_Y[startLevel];
        rig.root.position.set(startX, startY, startZ);
        this.ratsGroup.add(rig.root);

        this.agents.set(rat.id, {
          ratId: rat.id,
          rig,
          level: startLevel,
          x: startX,
          y: startY,
          z: startZ,
          yaw: index % 2 === 0 ? 0.6 : -0.5,
          targetX: startX,
          targetZ: startZ,
          targetLevel: startLevel,
          behavior: 'sniff',
          timer: 2.5 + index * 1.4,
          speed: 0.45,
          climbingRamp: false,
          rampProgress: 0,
          rampFromLevel: 0,
          rampToLevel: 0,
          spinRemaining: 0,
        });
      }
    });
  }

  public startArrivalCutscene(): void {
    this.cutsceneActive = true;
    this.cutsceneTime = 0;
    this.carrierObj.group.visible = true;
    this.carrierObj.lidPivot.rotation.x = 0;
    // Place starter rats inside carrier initially!
    const list = Array.from(this.agents.values());
    list.forEach((ag, idx) => {
      ag.level = 0;
      ag.x = -1.95 + (idx === 0 ? -0.14 : 0.14);
      ag.z = 0.55;
      ag.y = 0.25;
      ag.yaw = 0.85;
      ag.behavior = 'sniff';
      ag.rig.root.position.set(ag.x, ag.y, ag.z);
      ag.rig.root.rotation.y = ag.yaw;
    });
  }

  public stopCutscene(): void {
    if (!this.cutsceneActive) return;
    this.cutsceneActive = false;
    this.carrierObj.group.visible = this.cleaningMode;
    // Place rats comfortably inside the cage (one near house, one exploring hammock/shelf!)
    const list = Array.from(this.agents.values());
    if (list[0]) {
      list[0].level = 0;
      list[0].x = -0.55;
      list[0].z = 0.14;
      list[0].y = LEVEL_Y[0];
      list[0].behavior = 'sniff';
    }
    if (list[1]) {
      list[1].level = 1;
      list[1].x = -0.32;
      list[1].z = 0.12;
      list[1].y = LEVEL_Y[1];
      list[1].behavior = 'rear_up';
    }
    this.resetCamera();
  }

  public setCleaningMode(active: boolean): void {
    this.cleaningMode = active;
    if (!this.cutsceneActive) {
      this.carrierObj.group.visible = active;
      this.carrierObj.lidPivot.rotation.x = active ? -0.45 : 0;
    }
    if (active) {
      const list = Array.from(this.agents.values());
      list.forEach((ag, idx) => {
        ag.climbingRamp = false;
        ag.x = -1.95 + ((idx % 2) - 0.5) * 0.26;
        ag.z = 0.55 + (Math.floor(idx / 2) - 0.2) * 0.16;
        ag.y = 0.26;
        ag.behavior = 'sniff';
      });
    } else {
      const list = Array.from(this.agents.values());
      list.forEach((ag, idx) => {
        ag.level = idx % 2 === 0 ? 0 : 1;
        ag.x = (idx - 0.5) * 0.45;
        ag.z = 0.15;
        ag.y = this.activeZone === 'playpen' ? 0.05 : LEVEL_Y[ag.level];
      });
    }
  }

  public setPetMode(active: boolean): void {
    this.petMode = active;
  }

  public setFollowRat(ratId: string | null): void {
    this.followRatId = ratId;
  }

  public setCameraPreset(preset: 'overview' | 'pet_level' | 'closeup'): void {
    this.followRatId = null;
    if (preset === 'overview') {
      this.desiredAzimuth = 0.28;
      this.desiredPolar = 1.18;
      this.desiredRadius = this.activeZone === 'playpen' ? 4.2 : this.habitatLevel === 3 ? 4.55 : 3.85;
      this.desiredTarget.set(0, this.activeZone === 'playpen' ? 0.35 : 0.95, 0);
    } else if (preset === 'pet_level') {
      const ag = (this.selectedRatId && this.agents.get(this.selectedRatId)) || Array.from(this.agents.values())[0];
      if (ag) {
        this.desiredTarget.set(ag.x, ag.y + 0.12, ag.z);
        this.desiredPolar = 1.42;
        this.desiredRadius = 1.35;
      }
    } else if (preset === 'closeup') {
      const ag = (this.selectedRatId && this.agents.get(this.selectedRatId)) || Array.from(this.agents.values())[0];
      if (ag) {
        this.followRatId = ag.ratId;
        this.desiredPolar = 1.34;
        this.desiredRadius = 1.15;
      }
    }
  }

  public resetCamera(): void {
    this.setCameraPreset('overview');
  }

  public offerHand(): void {
    this.handOffered = true;
    this.handOfferTimer = 9;
    const baseY = this.activeZone === 'playpen' ? 0.12 : LEVEL_Y[0] + 0.05;
    this.handGroup.position.set(0.0, baseY, this.activeZone === 'playpen' ? 0.85 : 0.52);
    this.handGroup.visible = true;

    // Pick most curious/trusting rat to approach voluntarily!
    let best: RatSimAgent | null = null;
    let bestScore = -1;
    for (const ag of this.agents.values()) {
      const data = this.ratDataMap.get(ag.ratId);
      const p = data ? PERSONALITIES[data.personality] : null;
      const score = (data?.trust ?? 20) + (p ? p.exploreWeight * 25 : 20) + (ag.level === 0 ? 15 : 0);
      if (score > bestScore) {
        bestScore = score;
        best = ag;
      }
    }
    if (best) {
      best.level = 0;
      best.climbingRamp = false;
      best.behavior = 'approach_hand';
      best.targetX = this.handGroup.position.x;
      best.targetZ = this.handGroup.position.z - 0.22;
      best.timer = 7.5;
    }
  }

  public triggerRatAction(ratId: string, behavior: RatBehavior, duration = 5): void {
    const ag = this.agents.get(ratId);
    if (!ag) return;
    ag.behavior = behavior;
    ag.timer = duration;
    if (behavior === 'trick_spin') {
      ag.spinRemaining = Math.PI * 4;
    }
    if (behavior === 'enjoy_pet' || behavior === 'approach_hand' || behavior === 'trick_spin') {
      this.spawnHeart(ag.x, ag.y + 0.26, ag.z, '#EB7A6B');
    }
    if (behavior === 'eat') {
      const bowl = this.placedItems.find((i) => i.zone === this.activeZone && i.itemId === 'food_bowl');
      if (bowl) {
        ag.level = bowl.level;
        ag.targetX = bowl.x + 0.16;
        ag.targetZ = bowl.z;
      }
    }
    if (behavior === 'drink') {
      const bottle = this.placedItems.find((i) => i.zone === this.activeZone && i.itemId === 'water_bottle');
      if (bottle) {
        ag.level = bottle.level;
        ag.targetX = bottle.x - 0.24;
        ag.targetZ = bottle.z;
      }
    }
  }

  public callRatByName(ratId: string): void {
    const ag = this.agents.get(ratId);
    if (!ag) return;
    ag.climbingRamp = false;
    ag.behavior = 'walk';
    ag.targetX = 0;
    ag.targetZ = this.activeZone === 'playpen' ? 0.55 : 0.42;
    ag.timer = 4.5;
    this.spawnHeart(ag.x, ag.y + 0.28, ag.z, '#E8C563');
  }

  public setDecorPreview(spec: DecorPreviewSpec | null): void {
    if (this.previewGroup) {
      this.scene.remove(this.previewGroup);
      this.previewGroup = null;
    }
    if (!spec) return;

    const fakeItem: PlacedItem = {
      uid: 'preview',
      itemId: spec.itemId,
      zone: spec.zone,
      level: spec.level,
      x: spec.x,
      z: spec.z,
      rotation: spec.rotation,
      colorHex: spec.colorHex,
      fillLevel: 60,
    };
    const mesh = buildFurnitureMesh(fakeItem);
    mesh.traverse((obj) => {
      if ((obj as THREE.Mesh).isMesh) {
        const m = obj as THREE.Mesh;
        m.material = new THREE.MeshStandardMaterial({
          color: spec.valid ? '#6FCF8E' : '#E56B6B',
          transparent: true,
          opacity: 0.62,
          roughness: 0.5,
        });
      }
    });
    let y = spec.zone === 'playpen' ? 0.05 : LEVEL_Y[spec.level] ?? LEVEL_Y[0];
    if (spec.itemId === 'hammock' && spec.zone === 'cage') {
      const ceilingY = this.habitatLevel === 3 && spec.level === 1 ? LEVEL_Y[2] : (this.habitatLevel === 3 ? 2.65 : 1.88);
      y = ceilingY - 0.64;
    }
    mesh.position.set(spec.x, y, spec.z);
    mesh.rotation.y = spec.rotation;
    this.previewGroup = mesh;
    this.scene.add(this.previewGroup);
  }

  public spawnHeart(x: number, y: number, z: number, color = '#EB7A6B'): void {
    const geo = new THREE.SphereGeometry(0.032, 8, 8);
    geo.scale(1.15, 1.0, 0.6);
    const mat = new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.95 });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.set(x + (Math.random() - 0.5) * 0.08, y, z + (Math.random() - 0.5) * 0.08);
    this.effectsGroup.add(mesh);
    this.particles.push({ mesh, vy: 0.32, life: 0, maxLife: 1.25 });
  }

  public capturePhotoDataUrl(): string {
    this.renderer.render(this.scene, this.camera);
    return this.renderer.domElement.toDataURL('image/jpeg', 0.9);
  }

  public setPaused(p: boolean): void {
    this.paused = p;
  }

  public resize(): void {
    const w = Math.max(300, this.container.clientWidth);
    const h = Math.max(300, this.container.clientHeight);
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(w, h);
  }

  private bindEvents(): void {
    const el = this.renderer.domElement;
    el.style.touchAction = 'none';

    const onPointerDown = (e: PointerEvent) => {
      this.pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
      if (this.pointers.size === 1) {
        this.isDragging = true;
        this.lastPointerX = e.clientX;
        this.lastPointerY = e.clientY;
        this.pointerDownX = e.clientX;
        this.pointerDownY = e.clientY;
      } else if (this.pointers.size === 2) {
        const pts = Array.from(this.pointers.values());
        this.lastPinchDist = Math.hypot(pts[0].x - pts[1].x, pts[0].y - pts[1].y);
      }
    };

    const onPointerMove = (e: PointerEvent) => {
      if (!this.pointers.has(e.pointerId)) return;
      this.pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });

      if (this.pointers.size === 2) {
        const pts = Array.from(this.pointers.values());
        const dist = Math.hypot(pts[0].x - pts[1].x, pts[0].y - pts[1].y);
        const delta = this.lastPinchDist - dist;
        this.desiredRadius = THREE.MathUtils.clamp(this.desiredRadius + delta * 0.012, 1.05, 6.2);
        this.lastPinchDist = dist;
        return;
      }

      if (this.petMode) {
        this.handlePetRaycast(e.clientX, e.clientY);
        return;
      }

      if (this.isDragging && !this.cutsceneActive) {
        const dx = e.clientX - this.lastPointerX;
        const dy = e.clientY - this.lastPointerY;
        this.desiredAzimuth -= dx * 0.0075;
        this.desiredPolar = THREE.MathUtils.clamp(this.desiredPolar - dy * 0.006, 0.45, 1.52);
        this.lastPointerX = e.clientX;
        this.lastPointerY = e.clientY;
      }
    };

    const onPointerUp = (e: PointerEvent) => {
      const moved = Math.hypot(e.clientX - this.pointerDownX, e.clientY - this.pointerDownY);
      this.pointers.delete(e.pointerId);
      if (this.pointers.size === 0) {
        this.isDragging = false;
        if (moved < 10) {
          this.handleTapRaycast(e.clientX, e.clientY);
        }
      }
    };

    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      this.desiredRadius = THREE.MathUtils.clamp(this.desiredRadius + e.deltaY * 0.003, 1.05, 6.2);
    };

    const onResize = () => this.resize();

    el.addEventListener('pointerdown', onPointerDown);
    window.addEventListener('pointermove', onPointerMove);
    window.addEventListener('pointerup', onPointerUp);
    window.addEventListener('pointercancel', onPointerUp);
    el.addEventListener('wheel', onWheel, { passive: false });
    window.addEventListener('resize', onResize);

    this.cleanupEvents = () => {
      el.removeEventListener('pointerdown', onPointerDown);
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('pointerup', onPointerUp);
      window.removeEventListener('pointercancel', onPointerUp);
      el.removeEventListener('wheel', onWheel);
      window.removeEventListener('resize', onResize);
    };
  }

  private cleanupEvents: () => void = () => {};

  private raycastRat(clientX: number, clientY: number): string | null {
    const rect = this.renderer.domElement.getBoundingClientRect();
    const ndc = new THREE.Vector2(
      ((clientX - rect.left) / rect.width) * 2 - 1,
      -((clientY - rect.top) / rect.height) * 2 + 1
    );
    this.raycaster.setFromCamera(ndc, this.camera);
    const hits = this.raycaster.intersectObjects(this.ratsGroup.children, true);
    for (const h of hits) {
      let cur: THREE.Object3D | null = h.object;
      while (cur) {
        if (cur.userData?.ratId) return cur.userData.ratId as string;
        cur = cur.parent;
      }
    }
    return null;
  }

  private handleTapRaycast(clientX: number, clientY: number): void {
    const ratId = this.raycastRat(clientX, clientY);
    if (ratId) {
      this.callbacks.onSelectRat(ratId);
      const ag = this.agents.get(ratId);
      if (ag) this.spawnHeart(ag.x, ag.y + 0.25, ag.z, '#E8C563');
    }
  }

  private handlePetRaycast(clientX: number, clientY: number): void {
    const now = performance.now();
    if (now - this.lastPetStrokeAt < 420) return;
    const ratId = this.raycastRat(clientX, clientY);
    if (ratId) {
      this.lastPetStrokeAt = now;
      const ag = this.agents.get(ratId);
      if (ag) {
        ag.behavior = 'enjoy_pet';
        ag.timer = 2.8;
        this.spawnHeart(ag.x, ag.y + 0.26, ag.z, '#EB7A6B');
      }
      this.callbacks.onPetStroke(ratId);
    }
  }

  private loop = (nowMs: number): void => {
    this.rafId = requestAnimationFrame(this.loop);
    if (this.paused) return;

    const minDeltaMs = this.fpsLimit === 30 ? 30 : 14;
    if (nowMs - this.lastFrameMs < minDeltaMs) return;

    const dt = Math.min(0.08, (nowMs - this.lastFrameMs) / 1000);
    this.lastFrameMs = nowMs;
    this.elapsed += dt;

    if (this.cutsceneActive) {
      this.updateCutscene(dt);
    } else {
      this.updateAgents(dt);
      this.updateCamera(dt);
    }
    this.updateParticles(dt);

    this.renderer.render(this.scene, this.camera);

    this.labelTick += dt;
    if (this.labelTick > 0.08) {
      this.labelTick = 0;
      this.emitScreenLabels();
    }
  };

  private updateCutscene(dt: number): void {
    this.cutsceneTime += dt;
    const t = this.cutsceneTime;
    const list = Array.from(this.agents.values());

    // 0..4s: Camera zooms gently onto the cozy carrier; lid opens slowly
    if (t < 4.5) {
      const openK = THREE.MathUtils.clamp((t - 1.0) / 2.2, 0, 1);
      this.carrierObj.lidPivot.rotation.x = -openK * 1.45;
      this.camTarget.lerp(new THREE.Vector3(-1.85, 0.35, 0.5), dt * 2.5);
      this.camera.position.lerp(new THREE.Vector3(-1.2, 1.35, 2.35), dt * 2.2);
      this.camera.lookAt(this.camTarget);
    } else if (t < 14) {
      // 4.5..14s: Baby rats step out of carrier curiously and walk into their spacious cage!
      this.carrierObj.lidPivot.rotation.x = -1.45;
      const p1 = THREE.MathUtils.clamp((t - 4.5) / 6.0, 0, 1);
      const p2 = THREE.MathUtils.clamp((t - 6.2) / 6.5, 0, 1);

      if (list[0]) {
        list[0].x = THREE.MathUtils.lerp(-2.0, -0.58, p1);
        list[0].z = THREE.MathUtils.lerp(0.55, 0.14, p1);
        list[0].y = LEVEL_Y[0] + (p1 < 0.15 ? 0.04 : 0);
        list[0].yaw = Math.atan2(-0.58 - -2.0, 0.14 - 0.55);
        list[0].behavior = p1 < 0.96 ? 'walk' : 'sniff';
      }
      if (list[1]) {
        list[1].x = THREE.MathUtils.lerp(-1.8, 0.32, p2);
        list[1].z = THREE.MathUtils.lerp(0.55, 0.25, p2);
        list[1].y = LEVEL_Y[0];
        list[1].yaw = Math.atan2(0.32 - -1.8, 0.25 - 0.55);
        list[1].behavior = p2 > 0.02 && p2 < 0.96 ? 'walk' : 'rear_up';
      }
      this.camTarget.lerp(new THREE.Vector3(-0.3, 0.65, 0.15), dt * 1.8);
      this.camera.position.lerp(new THREE.Vector3(0.4, 1.45, 3.2), dt * 1.8);
      this.camera.lookAt(this.camTarget);
    } else {
      // 14..24s: Rat 1 peeks out from house, Rat 2 climbs to hammock on shelf 1!
      if (list[0]) {
        list[0].x = THREE.MathUtils.lerp(list[0].x, -0.66, dt * 1.5);
        list[0].z = THREE.MathUtils.lerp(list[0].z, 0.06, dt * 1.5);
        list[0].yaw = THREE.MathUtils.lerp(list[0].yaw, 0.35, dt * 2);
        list[0].behavior = 'sniff';
      }
      if (list[1]) {
        list[1].level = 1;
        list[1].x = THREE.MathUtils.lerp(list[1].x, -0.55, dt * 1.4);
        list[1].y = THREE.MathUtils.lerp(list[1].y, LEVEL_Y[1], dt * 1.8);
        list[1].z = THREE.MathUtils.lerp(list[1].z, 0.05, dt * 1.4);
        list[1].yaw = 0.6;
        list[1].behavior = 'rear_up';
      }
      this.camTarget.lerp(new THREE.Vector3(0, 0.9, 0), dt * 1.6);
      this.camera.position.lerp(new THREE.Vector3(1.1, 1.55, 3.65), dt * 1.4);
      this.camera.lookAt(this.camTarget);
    }

    for (const ag of list) {
      ag.rig.root.position.set(ag.x, ag.y, ag.z);
      ag.rig.root.rotation.y = ag.yaw;
      ag.rig.update(dt, {
        behavior: ag.behavior,
        speed: 0.9,
        time: this.elapsed,
        headLookYaw: 0,
        headLookPitch: 0,
        holdingFood: false,
        holdingPaper: false,
        holdingBall: false,
      });
    }
  }

  private updateAgents(dt: number): void {
    if (this.handOffered) {
      this.handOfferTimer -= dt;
      this.handGroup.position.y += Math.sin(this.elapsed * 2.5) * 0.0006;
      if (this.handOfferTimer <= 0) {
        this.handOffered = false;
        this.handGroup.visible = false;
      }
    }

    const list = Array.from(this.agents.values());
    for (const ag of list) {
      const data = this.ratDataMap.get(ag.ratId);
      const pers = data ? PERSONALITIES[data.personality] : PERSONALITIES.curious;

      if (this.cleaningMode) {
        ag.rig.root.position.set(ag.x, ag.y, ag.z);
        ag.rig.update(dt, {
          behavior: 'sniff',
          speed: 0,
          time: this.elapsed,
          headLookYaw: Math.sin(this.elapsed * 2 + ag.x) * 0.3,
          headLookPitch: -0.1,
          holdingFood: false,
          holdingPaper: false,
          holdingBall: false,
        });
        continue;
      }

      ag.timer -= dt;

      // Spin trick rotation
      if (ag.behavior === 'trick_spin' && ag.spinRemaining > 0) {
        const step = dt * 6.5;
        ag.yaw += step;
        ag.spinRemaining -= step;
      } else if (ag.climbingRamp && this.activeZone === 'cage') {
        ag.rampProgress += dt * 0.65 * pers.speedMult;
        const p = Math.min(1, ag.rampProgress);
        const isUpper = ag.rampFromLevel === 2 || ag.rampToLevel === 2;
        const rx = isUpper ? -0.45 : 0.42;
        const yFrom = LEVEL_Y[ag.rampFromLevel];
        const yTo = LEVEL_Y[ag.rampToLevel];
        const goingUp = ag.rampToLevel > ag.rampFromLevel;
        const zLow = isUpper ? 0.20 : 0.56;
        const zHigh = isUpper ? 0.14 : 0.22;
        const zFrom = goingUp ? zLow : zHigh;
        const zTo = goingUp ? zHigh : zLow;
        ag.x = THREE.MathUtils.lerp(ag.x, rx, dt * 6);
        ag.y = THREE.MathUtils.lerp(yFrom, yTo, p) + 0.025;
        ag.z = THREE.MathUtils.lerp(zFrom, zTo, p);
        ag.yaw = goingUp ? Math.PI : 0;
        ag.behavior = 'climb_ramp';
        if (p >= 1) {
          ag.climbingRamp = false;
          ag.level = ag.rampToLevel;
          ag.y = LEVEL_Y[ag.level];
          ag.z = goingUp ? zHigh - 0.12 : zLow;
          ag.behavior = 'sniff';
          ag.timer = 1.6;
        }
      } else if (
        ag.behavior === 'walk' ||
        ag.behavior === 'approach_hand' ||
        ag.behavior === 'carry_nesting' ||
        ag.behavior === 'tunnel_crawl' ||
        ag.behavior === 'trick_ball'
      ) {
        const dx = ag.targetX - ag.x;
        const dz = ag.targetZ - ag.z;
        const dist = Math.hypot(dx, dz);
        if (dist > 0.05) {
          const step = Math.min(dist, dt * 0.48 * pers.speedMult);
          ag.x += (dx / dist) * step;
          ag.z += (dz / dist) * step;
          const targetYaw = Math.atan2(dx, dz);
          let diff = targetYaw - ag.yaw;
          while (diff > Math.PI) diff -= Math.PI * 2;
          while (diff < -Math.PI) diff += Math.PI * 2;
          ag.yaw += diff * Math.min(1, dt * 8);
        } else {
          if (ag.behavior === 'approach_hand') {
            this.callbacks.onVoluntaryApproach(ag.ratId);
            this.spawnHeart(ag.x, ag.y + 0.25, ag.z, '#EB7A6B');
            ag.behavior = 'sniff';
            ag.timer = 3.2;
          } else {
            this.pickNextBehavior(ag, list);
          }
        }
      } else if (ag.timer <= 0) {
        this.pickNextBehavior(ag, list);
      }

      // Clamp smoothly inside safe habitat bounds (NEVER pass through bars or step off recessed shelf!)
      if (this.activeZone === 'cage') {
        ag.x = THREE.MathUtils.clamp(ag.x, -1.06, 1.06);
        const maxZForLevel = ag.level >= 1 ? 0.14 : 0.56;
        ag.z = THREE.MathUtils.clamp(ag.z, -0.56, maxZForLevel);
        if (!ag.climbingRamp && ag.behavior !== 'sleep_hammock') {
          const targetY = LEVEL_Y[ag.level] ?? LEVEL_Y[0];
          ag.y = THREE.MathUtils.lerp(ag.y, targetY, dt * 8);
        }
      } else {
        const d = Math.hypot(ag.x, ag.z);
        if (d > 1.42) {
          ag.x = (ag.x / d) * 1.42;
          ag.z = (ag.z / d) * 1.42;
        }
        ag.y = 0.05;
      }

      ag.rig.root.position.set(ag.x, ag.y, ag.z);
      ag.rig.root.rotation.y = ag.yaw;
      ag.rig.update(dt, {
        behavior: ag.behavior,
        speed: pers.speedMult,
        time: this.elapsed + ag.x * 1.3,
        headLookYaw: 0,
        headLookPitch: 0,
        holdingFood: ag.behavior === 'eat',
        holdingPaper: ag.behavior === 'carry_nesting',
        holdingBall: ag.behavior === 'trick_ball',
      });
    }
  }

  private pickNextBehavior(ag: RatSimAgent, allAgents: RatSimAgent[]): void {
    const data = this.ratDataMap.get(ag.ratId);
    const pers = data ? PERSONALITIES[data.personality] : PERSONALITIES.curious;
    const zoneItems = this.placedItems.filter((i) => i.zone === this.activeZone);

    // Rest if tired or cozy_lover rolls sleep
    const wantSleep = (data?.energy ?? 80) < 42 || Math.random() < 0.16 * pers.sleepWeight;
    if (wantSleep) {
      const hammock = zoneItems.find((i) => i.itemId === 'hammock');
      const house = zoneItems.find((i) => i.itemId === 'wood_house' || i.itemId === 'sleeping_pouch');
      if (hammock && this.activeZone === 'cage' && Math.random() < 0.55) {
        const ceilingY = this.habitatLevel === 3 && hammock.level === 1 ? LEVEL_Y[2] : (this.habitatLevel === 3 ? 2.65 : 1.88);
        const hammockBaseY = ceilingY - 0.64;
        ag.level = hammock.level;
        ag.x = hammock.x + (Math.random() - 0.5) * 0.08;
        ag.z = hammock.z;
        ag.y = hammockBaseY + 0.31; // Snug inside the U-shaped sherpa cradle!
        ag.behavior = 'sleep_hammock';
        ag.timer = 7 + Math.random() * 6;
        this.callbacks.onBehaviorChange?.(ag.ratId, ag.behavior, BEHAVIOR_RU[ag.behavior]);
        return;
      }
      if (house) {
        ag.level = house.level;
        ag.x = house.x;
        ag.z = house.z + 0.04;
        ag.y = this.activeZone === 'playpen' ? 0.05 : LEVEL_Y[house.level];
        ag.behavior = 'sleep_house';
        ag.timer = 7 + Math.random() * 5;
        this.callbacks.onBehaviorChange?.(ag.ratId, ag.behavior, BEHAVIOR_RU[ag.behavior]);
        return;
      }
    }

    // Social interaction with another rat nearby!
    const mate = allAgents.find((o) => o.ratId !== ag.ratId && o.level === ag.level && !o.climbingRamp);
    if (mate && Math.random() < 0.22 * pers.socialWeight) {
      const dist = Math.hypot(mate.x - ag.x, mate.z - ag.z);
      if (dist < 0.65) {
        const roll = Math.random();
        if (roll < 0.42) {
          ag.behavior = 'social_groom';
          ag.yaw = Math.atan2(mate.x - ag.x, mate.z - ag.z);
          ag.timer = 4.5;
          this.spawnHeart((ag.x + mate.x) * 0.5, ag.y + 0.26, (ag.z + mate.z) * 0.5, '#F4A6A0');
        } else if (roll < 0.78) {
          ag.behavior = 'play_wrestle';
          ag.timer = 3.8;
        } else {
          ag.behavior = 'cuddle_sleep';
          ag.x = mate.x + 0.14;
          ag.z = mate.z;
          ag.timer = 6.5;
        }
        this.callbacks.onBehaviorChange?.(ag.ratId, ag.behavior, BEHAVIOR_RU[ag.behavior]);
        return;
      } else {
        ag.behavior = 'walk';
        ag.targetX = mate.x + (Math.random() - 0.5) * 0.24;
        ag.targetZ = mate.z + (Math.random() - 0.5) * 0.24;
        ag.timer = 4;
        return;
      }
    }

    // Climb ramp to another level in cage
    if (this.activeZone === 'cage' && Math.random() < 0.16 * pers.exploreWeight) {
      const maxLevel = this.habitatLevel === 3 ? 2 : 1;
      const nextLvl = ag.level === 0 ? 1 : ag.level === 1 && maxLevel === 2 && Math.random() < 0.5 ? 2 : ag.level - 1;
      ag.climbingRamp = true;
      ag.rampProgress = 0;
      ag.rampFromLevel = ag.level;
      ag.rampToLevel = nextLvl;
      ag.behavior = 'climb_ramp';
      ag.timer = 3;
      this.callbacks.onBehaviorChange?.(ag.ratId, ag.behavior, BEHAVIOR_RU[ag.behavior]);
      return;
    }

    // Eat or Drink if hungry/thirsty
    const bowl = zoneItems.find((i) => i.itemId === 'food_bowl' && (i.fillLevel ?? 0) > 5);
    if (bowl && (data?.satiety ?? 80) < 75 && Math.random() < 0.35) {
      ag.level = bowl.level;
      ag.x = bowl.x + 0.16;
      ag.z = bowl.z + 0.08;
      ag.yaw = Math.atan2(bowl.x - ag.x, bowl.z - ag.z);
      ag.behavior = 'eat';
      ag.timer = 4.8;
      this.callbacks.onBehaviorChange?.(ag.ratId, ag.behavior, BEHAVIOR_RU[ag.behavior]);
      return;
    }

    const bottle = zoneItems.find((i) => i.itemId === 'water_bottle' && (i.fillLevel ?? 0) > 5);
    if (bottle && this.activeZone === 'cage' && (data?.hydration ?? 80) < 78 && Math.random() < 0.28) {
      ag.level = bottle.level;
      ag.x = bottle.x - 0.22;
      ag.z = bottle.z;
      ag.yaw = Math.PI / 2;
      ag.behavior = 'drink';
      ag.timer = 3.8;
      this.callbacks.onBehaviorChange?.(ag.ratId, ag.behavior, BEHAVIOR_RU[ag.behavior]);
      return;
    }

    // Otherwise natural cute idle/explore variety
    const roll = Math.random();
    if (roll < 0.44) {
      // Pick a clear random walk target inside zone
      ag.behavior = Math.random() < 0.18 && zoneItems.some((i) => i.itemId === 'nesting_paper')
        ? 'carry_nesting'
        : 'walk';
      if (this.activeZone === 'cage') {
        ag.targetX = (Math.random() - 0.5) * 1.9;
        ag.targetZ = (Math.random() - 0.5) * 0.92;
      } else {
        const a = Math.random() * Math.PI * 2;
        const r = Math.random() * 1.2;
        ag.targetX = Math.cos(a) * r;
        ag.targetZ = Math.sin(a) * r;
      }
      ag.timer = 4.5;
    } else if (roll < 0.60) {
      ag.behavior = 'sniff';
      ag.timer = 2.8 + Math.random() * 2;
    } else if (roll < 0.74) {
      ag.behavior = 'rear_up';
      ag.timer = 2.5 + Math.random() * 1.5;
    } else if (roll < 0.88) {
      ag.behavior = 'groom_face';
      ag.timer = 3.5 + Math.random() * 2;
    } else {
      ag.behavior = 'scratch_fur';
      ag.timer = 2.4;
    }

    this.callbacks.onBehaviorChange?.(ag.ratId, ag.behavior, BEHAVIOR_RU[ag.behavior]);
  }

  private updateCamera(dt: number): void {
    if (this.followRatId) {
      const ag = this.agents.get(this.followRatId);
      if (ag) {
        this.desiredTarget.set(ag.x, ag.y + 0.14, ag.z);
      }
    }

    const k = Math.min(1, dt * 6.5);
    this.camAzimuth = THREE.MathUtils.lerp(this.camAzimuth, this.desiredAzimuth, k);
    this.camPolar = THREE.MathUtils.lerp(this.camPolar, this.desiredPolar, k);
    this.camRadius = THREE.MathUtils.lerp(this.camRadius, this.desiredRadius, k);
    this.camTarget.lerp(this.desiredTarget, k);

    const sinP = Math.sin(this.camPolar);
    const x = this.camTarget.x + this.camRadius * sinP * Math.sin(this.camAzimuth);
    const y = Math.max(0.2, this.camTarget.y + this.camRadius * Math.cos(this.camPolar));
    const z = this.camTarget.z + this.camRadius * sinP * Math.cos(this.camAzimuth);

    this.camera.position.set(x, y, z);
    this.camera.lookAt(this.camTarget);
  }

  private updateParticles(dt: number): void {
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.life += dt;
      p.mesh.position.y += p.vy * dt;
      const mat = p.mesh.material as THREE.MeshBasicMaterial;
      mat.opacity = Math.max(0, 1 - p.life / p.maxLife);
      if (p.life >= p.maxLife) {
        this.effectsGroup.remove(p.mesh);
        this.particles.splice(i, 1);
      }
    }
  }

  private emitScreenLabels(): void {
    const w = this.renderer.domElement.clientWidth;
    const h = this.renderer.domElement.clientHeight;
    const labels: RatScreenLabel[] = [];
    const v = new THREE.Vector3();

    for (const ag of this.agents.values()) {
      const data = this.ratDataMap.get(ag.ratId);
      if (!data) continue;
      v.set(ag.x, ag.y + 0.34, ag.z);
      v.project(this.camera);
      const visible = v.z < 1 && v.x >= -1 && v.x <= 1 && v.y >= -1 && v.y <= 1;
      labels.push({
        id: ag.ratId,
        name: data.name,
        x: (v.x * 0.5 + 0.5) * w,
        y: (-v.y * 0.5 + 0.5) * h,
        visible,
        behaviorLabel: BEHAVIOR_RU[ag.behavior] || '',
      });
    }
    this.callbacks.onLabelsUpdate(labels);
  }

  public dispose(): void {
    cancelAnimationFrame(this.rafId);
    this.cleanupEvents();
    this.renderer.dispose();
    if (this.renderer.domElement.parentNode === this.container) {
      this.container.removeChild(this.renderer.domElement);
    }
  }
}
