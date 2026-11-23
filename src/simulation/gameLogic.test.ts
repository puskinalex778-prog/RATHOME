import { describe, expect, it, beforeEach } from 'vitest';
import { COAT_PRESETS, getAllowedEyeColors } from '../data/coats';
import {
  applyOfflineProgress,
  BACKUP_KEY,
  loadGameState,
  SAVE_KEY,
  saveGameState,
} from '../services/saveSystem';
import {
  awardCoinsGuarded,
  createInitialGameState,
  createRat,
  createStarterAppearance1,
  createStarterAppearance2,
  evaluateQuestsAndAchievements,
  inheritAppearance,
  stepSimulation,
  validatePlacement,
} from './gameLogic';

// Simple in-memory localStorage mock for Node test environment
class MemoryStorage implements Storage {
  private store = new Map<string, string>();
  get length() {
    return this.store.size;
  }
  clear() {
    this.store.clear();
  }
  getItem(key: string) {
    return this.store.get(key) ?? null;
  }
  key(index: number) {
    return Array.from(this.store.keys())[index] ?? null;
  }
  removeItem(key: string) {
    this.store.delete(key);
  }
  setItem(key: string, value: string) {
    this.store.set(key, value);
  }
}

describe('Крыски дома — core game mechanics & save verification', () => {
  beforeEach(() => {
    globalThis.localStorage = new MemoryStorage();
  });

  it('includes all 20+ required coat presets including white/gray stripe with white head and gray cap', () => {
    expect(COAT_PRESETS.length).toBeGreaterThanOrEqual(21);
    const ids = new Set(COAT_PRESETS.map((c) => c.id));
    expect(ids.has('white_gray_back_stripe')).toBe(true);
    expect(ids.has('white_gray_back_stripe_capped')).toBe(true);
    expect(ids.has('solid_gray')).toBe(true);
    expect(ids.has('white_black_eyes')).toBe(true);
    expect(ids.has('albino')).toBe(true);
    expect(ids.has('siamese')).toBe(true);
    expect(ids.has('himalayan')).toBe(true);
    expect(ids.has('agouti')).toBe(true);
    expect(ids.has('white_gray_spots')).toBe(true);
    expect(ids.has('white_black_spots')).toBe(true);

    // Normal mode constrains eye colors realistically; Creative mode unlocks all
    expect(getAllowedEyeColors({ baseColor: 'black', pattern: 'solid' }, false)).toEqual(['dark']);
    expect(getAllowedEyeColors({ baseColor: 'black', pattern: 'solid' }, true)).toEqual(['dark', 'ruby', 'red']);
  });

  it('creates initial same-sex pair with breeding OFF by default and comfort mode ON', () => {
    const r1 = createRat({ name: 'Полоска', sex: 'female', appearance: createStarterAppearance1() });
    const r2 = createRat({ name: 'Дымка', sex: 'female', appearance: createStarterAppearance2() });
    const state = createInitialGameState(r1, r2);

    expect(state.rats.length).toBe(2);
    expect(state.settings.breedingEnabled).toBe(false);
    expect(state.settings.comfortMode).toBe(true);
    expect(state.settings.naturalDeathEnabled).toBe(false);
    expect(state.rats[0].relationships[state.rats[1].id]).toBeGreaterThan(50);
  });

  it('saves, creates rolling backup, recovers from corrupted main save, and caps offline decay safely', () => {
    const r1 = createRat({ name: 'Полоска', sex: 'female', appearance: createStarterAppearance1() });
    const r2 = createRat({ name: 'Дымка', sex: 'female', appearance: createStarterAppearance2() });
    const state = createInitialGameState(r1, r2);
    state.coins = 250;

    // First save + second save populates rolling backup
    expect(saveGameState(state)).toBe(true);
    state.coins = 310;
    expect(saveGameState(state)).toBe(true);

    const loadedNormal = loadGameState();
    expect(loadedNormal.restoredFromBackup).toBe(false);
    expect(loadedNormal.state?.coins).toBe(310);

    // Corrupt primary save -> should seamlessly restore from backup!
    localStorage.setItem(SAVE_KEY, '{corrupted_json');
    expect(localStorage.getItem(BACKUP_KEY)).toBeTruthy();
    const recovered = loadGameState();
    expect(recovered.restoredFromBackup).toBe(true);
    expect(recovered.state?.coins).toBe(250);

    // Simulate 30 days offline -> pets NEVER die and stay within safe bounds!
    const oldState = {
      ...state,
      lastActiveAt: Date.now() - 1000 * 60 * 60 * 24 * 30,
    };
    const afterAway = applyOfflineProgress(oldState);
    expect(afterAway.rats.length).toBe(2);
    for (const r of afterAway.rats) {
      expect(r.satiety).toBeGreaterThanOrEqual(52);
      expect(r.hydration).toBeGreaterThanOrEqual(58);
      expect(r.health).toBeGreaterThanOrEqual(85);
    }
  });

  it('prevents infinite coin farming via cooldown guard', () => {
    const r1 = createRat({ name: 'Полоска', sex: 'female', appearance: createStarterAppearance1() });
    const r2 = createRat({ name: 'Дымка', sex: 'female', appearance: createStarterAppearance2() });
    const state = createInitialGameState(r1, r2);

    const first = awardCoinsGuarded(state, 'care_feed', 10, 30000);
    expect(first.granted).toBe(10);
    const second = awardCoinsGuarded(first.state, 'care_feed', 10, 30000);
    expect(second.granted).toBe(0);
    expect(second.state.coins).toBe(first.state.coins);
  });

  it('validates furniture placement collisions, ramp clearance, and shelf limits', () => {
    const r1 = createRat({ name: 'Полоска', sex: 'female', appearance: createStarterAppearance1() });
    const r2 = createRat({ name: 'Дымка', sex: 'female', appearance: createStarterAppearance2() });
    const state = createInitialGameState(r1, r2);

    // Placing directly on top of existing wooden house should fail
    const overlap = validatePlacement(
      { itemId: 'foraging_box', zone: 'cage', level: 0, x: -0.78, z: -0.22, rotation: 0, colorHex: '#B8946B' },
      state.placedItems,
      2
    );
    expect(overlap.valid).toBe(false);

    // Blocking ramp walkway should fail
    const rampBlock = validatePlacement(
      { itemId: 'foraging_box', zone: 'cage', level: 0, x: 0.42, z: 0.0, rotation: 0, colorHex: '#B8946B' },
      state.placedItems,
      2
    );
    expect(rampBlock.valid).toBe(false);

    // Placing on level 2 in 2-level cage should fail, but succeed in 3-level cage
    const lvl2InSmall = validatePlacement(
      { itemId: 'wood_house', zone: 'cage', level: 2, x: -0.5, z: 0, rotation: 0, colorHex: '#D4B082' },
      state.placedItems,
      2
    );
    expect(lvl2InSmall.valid).toBe(false);

    const lvl2InBig = validatePlacement(
      { itemId: 'wood_house', zone: 'cage', level: 2, x: -0.5, z: 0, rotation: 0, colorHex: '#D4B082' },
      state.placedItems,
      3
    );
    expect(lvl2InBig.valid).toBe(true);
  });

  it('runs simulation tick, evaluates quests/achievements, and supports simplified coat inheritance', () => {
    const r1 = createRat({ name: 'Полоска', sex: 'female', appearance: createStarterAppearance1() });
    const r2 = createRat({ name: 'Дымка', sex: 'female', appearance: createStarterAppearance2() });
    let state = createInitialGameState(r1, r2);
    state.stats.petsGiven = 6;
    state.stats.photosTaken = 3;

    const evaluated = evaluateQuestsAndAchievements(state);
    expect(evaluated.quests.q_pet_five.completed).toBe(true);
    expect(evaluated.quests.q_first_photo.completed).toBe(true);

    const stepped = stepSimulation(evaluated, 12);
    expect(stepped.state.rats.length).toBe(2);
    expect(stepped.state.inGameDay).toBeGreaterThan(1);

    const childApp = inheritAppearance(r1.appearance, r2.appearance);
    expect(['standard', 'dumbo']).toContain(childApp.ears);
    expect(['smooth', 'rex']).toContain(childApp.coatTexture);
  });
});
