export type EarType = 'standard' | 'dumbo';
export type CoatTexture = 'smooth' | 'rex';
export type EyeColorId = 'dark' | 'ruby' | 'red';
export type RatSex = 'female' | 'male';
export type LifeStage = 'baby' | 'teen' | 'adult' | 'senior';

export type BaseColorId =
  | 'white'
  | 'gray'
  | 'black'
  | 'blue_gray'
  | 'agouti'
  | 'beige'
  | 'cream'
  | 'chocolate'
  | 'silver';

export type PatternId =
  | 'solid'
  | 'dorsal_stripe'       // белая с продольной полосой по спине (голова белая или с шапочкой)
  | 'hooded_stripe'       // тёмная голова + полоса вдоль спины
  | 'capped'              // белое тело + тёмная голова без полосы
  | 'patched'             // крупные пятна
  | 'berkshire'           // однотонная с белым животиком и белыми лапками
  | 'siamese'             // светлое тело, затемнённые мордочка/ушки/лапки/хвост
  | 'himalayan'           // почти белое тело, мягкие отметины на мордочке/лапках
  | 'spotted';            // белая с небольшими пятнышками

export type CoatPresetId =
  | 'white_gray_back_stripe'
  | 'white_gray_back_stripe_capped'
  | 'solid_gray'
  | 'white_black_eyes'
  | 'albino'
  | 'black'
  | 'black_hooded'
  | 'gray_white_patched'
  | 'black_white_belly'
  | 'gray_white_belly'
  | 'blue_gray'
  | 'agouti'
  | 'beige'
  | 'cream'
  | 'chocolate'
  | 'gray_capped'
  | 'siamese'
  | 'himalayan'
  | 'silver'
  | 'white_gray_spots'
  | 'white_black_spots';

export type PersonalityId =
  | 'curious'
  | 'cautious'
  | 'sociable'
  | 'active'
  | 'calm'
  | 'puzzle_lover'
  | 'explorer'
  | 'cozy_lover';

export type RatBehavior =
  | 'idle'
  | 'walk'
  | 'sniff'
  | 'rear_up'
  | 'groom_face'
  | 'scratch_fur'
  | 'eat'
  | 'drink'
  | 'carry_nesting'
  | 'climb_ramp'
  | 'tunnel_crawl'
  | 'sleep_hammock'
  | 'sleep_house'
  | 'cuddle_sleep'
  | 'social_groom'
  | 'play_wrestle'
  | 'tension'
  | 'approach_hand'
  | 'enjoy_pet'
  | 'trick_spin'
  | 'trick_target'
  | 'trick_ball';

export interface RatAppearance {
  presetId: CoatPresetId | 'custom';
  baseColor: BaseColorId;
  markingColor: BaseColorId;
  pattern: PatternId;
  headCap: boolean; // relevant for dorsal_stripe: white head vs gray cap
  ears: EarType;
  coatTexture: CoatTexture;
  eyeColor: EyeColorId;
}

export interface RatEntity {
  id: string;
  name: string;
  sex: RatSex;
  ageDays: number;
  lifeStage: LifeStage;
  appearance: RatAppearance;
  personality: PersonalityId;
  // Needs & Status (0..100)
  satiety: number;
  hydration: number;
  health: number;
  comfort: number;
  energy: number;
  trust: number;
  // Behavior & social
  behavior: RatBehavior;
  behaviorTimer: number;
  relationships: Record<string, number>; // otherRatId -> 0..100
  favoriteToyType: FurnitureItemId;
  learnedTricks: TrickId[];
  parentNames?: [string, string];
  adoptedAt: number;
  // Optional breeding state (when enabled)
  pregnancyDays?: number;
  mateId?: string;
  // Optional mild illness (treated by game vet)
  needsVet?: boolean;
  vetNote?: string;
  // Tension partner (rare, clearly distinguishable from friendly wrestle)
  tensionWithId?: string;
  // Cached status note
  statusText: string;
}

export type TrickId =
  | 'come_when_called'
  | 'spin'
  | 'touch_target'
  | 'press_button'
  | 'fetch_ball'
  | 'walk_bridge';

export type FurnitureItemId =
  | 'wood_house'
  | 'hammock'
  | 'sleeping_pouch'
  | 'tunnel'
  | 'bridge'
  | 'shelf'
  | 'food_bowl'
  | 'water_bottle'
  | 'foraging_box'
  | 'puzzle_feeder'
  | 'chew_sticks'
  | 'nesting_paper'
  | 'litter_tray'
  | 'safe_wheel';

export type PlacementSlot = 'floor' | 'shelf' | 'hanging' | 'wall';

export interface PlacedItem {
  uid: string;
  itemId: FurnitureItemId;
  zone: 'cage' | 'playpen';
  level: number; // 0 = floor, 1 = shelf 1, 2 = shelf 2
  x: number;
  z: number;
  rotation: number; // radians
  colorHex: string;
  fillLevel?: number; // 0..100 for food_bowl / water_bottle
  foodKind?: FoodType;
  perishableAt?: number; // timestamp when veggies/fruit spoil
}

export type FoodType = 'pellets' | 'vegetables' | 'fruit_treat' | 'game_treat';

export type RoomThemeId =
  | 'scandinavian'
  | 'forest'
  | 'pastel_nursery'
  | 'space_station'
  | 'mini_city'
  | 'autumn_cozy';

export type ActiveZone = 'cage' | 'playpen';

export interface QuestProgress {
  id: string;
  progress: number;
  completed: boolean;
  claimed: boolean;
}

export interface PhotoEntry {
  id: string;
  dataUrl: string;
  caption: string;
  ratNames: string[];
  createdAt: number;
}

export interface MemoryEntry {
  id: string;
  ratName: string;
  appearance: RatAppearance;
  personality: PersonalityId;
  ageDays: number;
  favoriteToy: FurnitureItemId;
  learnedTricks: TrickId[];
  photoUrl?: string;
  note: string;
  savedAt: number;
}

export interface CleaningMetrics {
  beddingClean: number;   // 0..100
  litterClean: number;    // 0..100
  bowlsClean: number;     // 0..100
  shelvesClean: number;   // 0..100
  hammockClean: number;   // 0..100
  playpenClean: number;   // 0..100
  leftoversCount: number;
  familiarScent: number;  // 0..100 (healthy ~40-90; over-sterilizing drops comfort slightly)
}

export interface GameSettings {
  musicVolume: number;        // 0..1
  sfxVolume: number;          // 0..1
  vibration: boolean;
  reducedMotion: boolean;
  graphicsQuality: 'low' | 'medium' | 'high';
  fpsLimit: 30 | 60;
  // Core gameplay mode toggles
  comfortMode: boolean;       // default true
  breedingEnabled: boolean;   // default false!
  agingEnabled: boolean;      // default true (paused when comfortMode + user toggles off)
  naturalDeathEnabled: boolean; // default false
  creativeCoatMode: boolean;  // default false (true allows any combination)
  showHints: boolean;
}

export interface GameState {
  version: number;
  initialized: boolean;
  cutsceneCompleted: boolean;
  coins: number;
  habitatLevel: 2 | 3;
  playpenUnlocked: boolean;
  activeZone: ActiveZone;
  theme: RoomThemeId;
  unlockedThemes: RoomThemeId[];
  rats: RatEntity[];
  placedItems: PlacedItem[];
  inventory: Partial<Record<FurnitureItemId, number>>;
  foodStock: Record<FoodType, number>;
  cleaning: CleaningMetrics;
  quests: Record<string, QuestProgress>;
  achievements: string[];
  discoveredPresets: CoatPresetId[];
  photos: PhotoEntry[];
  memories: MemoryEntry[];
  settings: GameSettings;
  // Anti-exploit cooldown timestamps (ms)
  rewardCooldowns: Record<string, number>;
  // Metrics for quests/achievements
  stats: {
    petsGiven: number;
    treatsGiven: number;
    cleaningsDone: number;
    minigamesWon: number;
    photosTaken: number;
    voluntaryApproaches: number;
    rehomedBabies: number;
    vetVisits: number;
  };
  lastSavedAt: number;
  lastActiveAt: number;
  inGameDay: number;
}
