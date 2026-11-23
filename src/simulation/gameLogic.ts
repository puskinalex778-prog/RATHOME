import {
  ACHIEVEMENTS_CATALOG,
  FURNITURE_CATALOG,
  QUESTS_CATALOG,
} from '../data/catalog';
import {
  COAT_PRESETS,
  PERSONALITY_LIST,
} from '../data/coats';
import { computeLifeStage } from '../services/saveSystem';
import {
  CoatPresetId,
  FurnitureItemId,
  GameState,
  PersonalityId,
  PlacedItem,
  RatAppearance,
  RatEntity,
  RatSex,
} from '../types/game';

export const MAX_RATS_LIMIT = 6;

export function makeUid(prefix: string): string {
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`;
}

export function createRat(params: {
  name: string;
  sex: RatSex;
  appearance: RatAppearance;
  personality?: PersonalityId;
  ageDays?: number;
  parentNames?: [string, string];
  initialTrust?: number;
}): RatEntity {
  const personality =
    params.personality ??
    PERSONALITY_LIST[Math.floor(Math.random() * PERSONALITY_LIST.length)].id;
  const ageDays = params.ageDays ?? 28; // baby rat!
  const favPool: FurnitureItemId[] = ['hammock', 'foraging_box', 'tunnel', 'puzzle_feeder', 'wood_house', 'sleeping_pouch', 'bridge'];
  const favoriteToyType = favPool[Math.floor(Math.random() * favPool.length)];

  return {
    id: makeUid('rat'),
    name: params.name.trim() || 'Крыска',
    sex: params.sex,
    ageDays,
    lifeStage: computeLifeStage(ageDays),
    appearance: { ...params.appearance },
    personality,
    satiety: 76,
    hydration: 82,
    health: 98,
    comfort: 82,
    energy: 88,
    trust: params.initialTrust ?? 18,
    behavior: 'sniff',
    behaviorTimer: 4,
    relationships: {},
    favoriteToyType,
    learnedTricks: [],
    parentNames: params.parentNames,
    adoptedAt: Date.now(),
    statusText: 'Любопытно обнюхивает новый дом',
  };
}

export function createStarterAppearance1(): RatAppearance {
  const p = COAT_PRESETS.find((c) => c.id === 'white_gray_back_stripe')!;
  return {
    ...p.appearance,
    ears: 'standard',
    coatTexture: 'smooth',
  };
}

export function createStarterAppearance2(): RatAppearance {
  const p = COAT_PRESETS.find((c) => c.id === 'solid_gray')!;
  return {
    ...p.appearance,
    ears: 'standard',
    coatTexture: 'smooth',
  };
}

export function createDefaultPlacedItems(): PlacedItem[] {
  return [
    {
      uid: 'item_house_1',
      itemId: 'wood_house',
      zone: 'cage',
      level: 0,
      x: -0.78,
      z: -0.22,
      rotation: 0.25,
      colorHex: '#D4B082',
    },
    {
      uid: 'item_bowl_1',
      itemId: 'food_bowl',
      zone: 'cage',
      level: 0,
      x: 0.05,
      z: 0.34,
      rotation: 0,
      colorHex: '#55827E',
      fillLevel: 45,
      foodKind: 'pellets',
    },
    {
      uid: 'item_litter_1',
      itemId: 'litter_tray',
      zone: 'cage',
      level: 0,
      x: 0.85,
      z: -0.36,
      rotation: 0,
      colorHex: '#6F8672',
    },
    {
      uid: 'item_water_1',
      itemId: 'water_bottle',
      zone: 'cage',
      level: 0,
      x: 1.24,
      z: 0.22,
      rotation: 0,
      colorHex: '#6F8672',
      fillLevel: 55,
    },
    {
      uid: 'item_hammock_1',
      itemId: 'hammock',
      zone: 'cage',
      level: 1,
      x: -0.68,
      z: -0.2,
      rotation: 0,
      colorHex: '#6F8672',
    },
    {
      uid: 'item_house_2',
      itemId: 'wood_house',
      zone: 'cage',
      level: 1,
      x: 0.72,
      z: -0.32,
      rotation: -0.25,
      colorHex: '#D4B082',
    },
    {
      uid: 'item_chew_1',
      itemId: 'chew_sticks',
      zone: 'cage',
      level: 1,
      x: 0.05,
      z: -0.1,
      rotation: 0.4,
      colorHex: '#9C7B56',
    },
    // Cozy default items inside the Playpen (unlocked later or when bought)
    {
      uid: 'item_pp_tunnel',
      itemId: 'tunnel',
      zone: 'playpen',
      level: 0,
      x: -0.95,
      z: -0.45,
      rotation: 0.5,
      colorHex: '#6F8672',
    },
    {
      uid: 'item_pp_bridge',
      itemId: 'bridge',
      zone: 'playpen',
      level: 0,
      x: 0.0,
      z: 0.25,
      rotation: 0.2,
      colorHex: '#D4B082',
    },
    {
      uid: 'item_pp_forage',
      itemId: 'foraging_box',
      zone: 'playpen',
      level: 0,
      x: 0.9,
      z: -0.4,
      rotation: -0.3,
      colorHex: '#B8946B',
    },
  ];
}

export function createInitialGameState(
  rat1: RatEntity,
  rat2: RatEntity
): GameState {
  // Friendly starter bond between same-sex pair from the center
  rat1.relationships[rat2.id] = 58;
  rat2.relationships[rat1.id] = 58;

  const discovered: CoatPresetId[] = [];
  if (rat1.appearance.presetId !== 'custom') discovered.push(rat1.appearance.presetId);
  if (rat2.appearance.presetId !== 'custom' && !discovered.includes(rat2.appearance.presetId)) {
    discovered.push(rat2.appearance.presetId);
  }

  const quests: GameState['quests'] = {};
  for (const q of QUESTS_CATALOG) {
    quests[q.id] = {
      id: q.id,
      progress: q.id === 'q_name_pair' ? 1 : 0,
      completed: q.id === 'q_name_pair',
      claimed: false,
    };
  }

  return {
    version: 1,
    initialized: true,
    cutsceneCompleted: false,
    coins: 120,
    habitatLevel: 2,
    playpenUnlocked: false,
    activeZone: 'cage',
    theme: 'scandinavian',
    unlockedThemes: ['scandinavian'],
    rats: [rat1, rat2],
    placedItems: createDefaultPlacedItems(),
    inventory: {
      sleeping_pouch: 1,
      nesting_paper: 1,
    },
    foodStock: {
      pellets: 8,
      vegetables: 3,
      fruit_treat: 3,
      game_treat: 5,
    },
    cleaning: {
      beddingClean: 86,
      litterClean: 82,
      bowlsClean: 90,
      shelvesClean: 88,
      hammockClean: 92,
      playpenClean: 95,
      leftoversCount: 0,
      familiarScent: 78,
    },
    quests,
    achievements: ['ach_welcome'],
    discoveredPresets: discovered,
    photos: [],
    memories: [],
    settings: {
      musicVolume: 0.35,
      sfxVolume: 0.65,
      vibration: true,
      reducedMotion: false,
      graphicsQuality: 'medium',
      fpsLimit: 30,
      comfortMode: true,
      breedingEnabled: false,
      agingEnabled: true,
      naturalDeathEnabled: false,
      creativeCoatMode: false,
      showHints: true,
    },
    rewardCooldowns: {},
    stats: {
      petsGiven: 0,
      treatsGiven: 0,
      cleaningsDone: 0,
      minigamesWon: 0,
      photosTaken: 0,
      voluntaryApproaches: 0,
      rehomedBabies: 0,
      vetVisits: 0,
    },
    lastSavedAt: Date.now(),
    lastActiveAt: Date.now(),
    inGameDay: 1,
  };
}

/**
 * Validate furniture placement (bounds, overlap check, safe height & clear ramp route)
 */
export function validatePlacement(
  candidate: Omit<PlacedItem, 'uid'>,
  existingItems: PlacedItem[],
  habitatLevel: 2 | 3,
  ignoreUid?: string
): { valid: boolean; reason?: string } {
  const def = FURNITURE_CATALOG[candidate.itemId];
  if (!def.allowedZones.includes(candidate.zone)) {
    return { valid: false, reason: 'Этот предмет нельзя разместить в выбранной зоне.' };
  }

  if (candidate.zone === 'cage') {
    const maxLevel = habitatLevel === 3 ? 2 : 1;
    if (candidate.level > maxLevel) {
      return { valid: false, reason: 'Этот ярус откроется в 3-ярусной клетке.' };
    }
    if (candidate.itemId === 'hammock' && candidate.level === 0) {
      return { valid: false, reason: 'Гамак подвешивается под верхним ярусом, чтобы оставался безопасный проход.' };
    }
    if (candidate.itemId === 'water_bottle') {
      // Mounts on right wall
      if (Math.abs(candidate.x) < 1.0) {
        return { valid: false, reason: 'Поилка крепится к стенке клетки.' };
      }
    } else {
      if (Math.abs(candidate.x) > 1.05 || Math.abs(candidate.z) > 0.52) {
        return { valid: false, reason: 'Предмет выходит за границы безопасной клетки.' };
      }
      // Preserve ramp walkway on ground & shelf 1 (x around 0.25..0.55, z around -0.1..0.35)
      if (candidate.level === 0 && candidate.x > 0.15 && candidate.x < 0.72 && candidate.z > -0.25 && candidate.z < 0.22) {
        return { valid: false, reason: 'Здесь проходит лесенка — оставьте проход свободным для лапок.' };
      }
    }
  } else {
    // Playpen octagonal radius ~ 1.65
    const dist = Math.hypot(candidate.x, candidate.z);
    if (dist > 1.38) {
      return { valid: false, reason: 'Разместите предмет внутри защищённого манежа.' };
    }
  }

  // Overlap check with items on same zone & level
  for (const item of existingItems) {
    if (item.uid === ignoreUid) continue;
    if (item.zone !== candidate.zone || item.level !== candidate.level) continue;
    const otherDef = FURNITURE_CATALOG[item.itemId];
    const minDist = (def.footprintRadius + otherDef.footprintRadius) * 0.78;
    const d = Math.hypot(item.x - candidate.x, item.z - candidate.z);
    if (d < minDist) {
      return { valid: false, reason: `Слишком близко к «${otherDef.name}» — крыскам нужен свободный проход.` };
    }
  }

  return { valid: true };
}

/**
 * Anti-exploit coin award: prevents farming infinite coins by repeatedly refilling full bowl or moving same item
 */
export function awardCoinsGuarded(
  state: GameState,
  actionKey: string,
  amount: number,
  cooldownMs: number
): { state: GameState; granted: number } {
  const now = Date.now();
  const last = state.rewardCooldowns[actionKey] ?? 0;
  if (now - last < cooldownMs) {
    return { state, granted: 0 };
  }
  return {
    granted: amount,
    state: {
      ...state,
      coins: state.coins + amount,
      rewardCooldowns: {
        ...state.rewardCooldowns,
        [actionKey]: now,
      },
    },
  };
}

/**
 * Simplified game genetics model for optional breeding (explicitly disclosed in UI as a game model)
 */
export function inheritAppearance(p1: RatAppearance, p2: RatAppearance): RatAppearance {
  const pick = <T,>(a: T, b: T): T => (Math.random() < 0.5 ? a : b);
  const samePreset = Math.random() < 0.65;
  if (samePreset) {
    const chosen = Math.random() < 0.5 ? p1 : p2;
    return {
      ...chosen,
      ears: pick(p1.ears, p2.ears),
      coatTexture: pick(p1.coatTexture, p2.coatTexture),
    };
  }
  return {
    presetId: 'custom',
    baseColor: pick(p1.baseColor, p2.baseColor),
    markingColor: pick(p1.markingColor, p2.markingColor),
    pattern: pick(p1.pattern, p2.pattern),
    headCap: pick(p1.headCap, p2.headCap),
    ears: pick(p1.ears, p2.ears),
    coatTexture: pick(p1.coatTexture, p2.coatTexture),
    eyeColor: pick(p1.eyeColor, p2.eyeColor),
  };
}

/**
 * Recompute quest progress and achievement unlocks cleanly
 */
export function evaluateQuestsAndAchievements(state: GameState): GameState {
  const nextQuests = { ...state.quests };
  const updateQ = (id: string, value: number) => {
    const def = QUESTS_CATALOG.find((q) => q.id === id);
    if (!def) return;
    const prev = nextQuests[id] ?? { id, progress: 0, completed: false, claimed: false };
    const progress = Math.max(prev.progress, Math.min(def.target, value));
    nextQuests[id] = {
      ...prev,
      progress,
      completed: prev.completed || progress >= def.target,
    };
  };

  const restSpots = state.placedItems.filter(
    (i) => i.zone === 'cage' && FURNITURE_CATALOG[i.itemId]?.isRestSpot
  ).length;
  updateQ('q_three_rest_spots', restSpots);
  updateQ('q_pet_five', state.stats.petsGiven);
  updateQ('q_voluntary_hand', state.stats.voluntaryApproaches);
  updateQ('q_first_photo', state.stats.photosTaken);
  updateQ('q_gentle_clean', state.stats.cleaningsDone);
  updateQ('q_foraging_play', state.stats.minigamesWon);
  if (state.playpenUnlocked) updateQ('q_unlock_playpen', 1);

  const hasCome = state.rats.some((r) => r.learnedTricks.includes('come_when_called'));
  if (hasCome) updateQ('q_learn_call', 1);

  const distinctTricks = new Set<string>();
  state.rats.forEach((r) => r.learnedTricks.forEach((t) => distinctTricks.add(t)));
  updateQ('q_three_tricks', distinctTricks.size);

  // Achievements
  const achs = new Set(state.achievements);
  if (state.rats.length >= 2) achs.add('ach_welcome');
  if (state.rats.some((r) => r.trust >= 80)) achs.add('ach_trust_friend');
  if (state.rats.some((r) => Object.values(r.relationships).some((v) => v >= 80))) {
    achs.add('ach_cuddle_buddies');
  }
  if (state.placedItems.length >= 7) achs.add('ach_designer');
  if (state.stats.minigamesWon >= 5) achs.add('ach_trainer');
  if (state.photos.length >= 3) achs.add('ach_photographer');
  if (state.habitatLevel >= 3) achs.add('ach_mansion');

  // Ensure every catalog achievement id is valid
  const validIds = new Set(ACHIEVEMENTS_CATALOG.map((a) => a.id));
  const filteredAchs = Array.from(achs).filter((id) => validIds.has(id));

  return {
    ...state,
    quests: nextQuests,
    achievements: filteredAchs,
  };
}

/**
 * Periodic simulation step (called every ~4 seconds while game is active)
 */
export function stepSimulation(state: GameState, dtSeconds: number): {
  state: GameState;
  notice?: string;
} {
  let notice: string | undefined;
  const comfort = state.settings.comfortMode;
  const minStat = comfort ? 48 : 18;
  const minClean = comfort ? 50 : 20;

  const cageItems = state.placedItems.filter((i) => i.zone === 'cage');
  const bowl = cageItems.find((i) => i.itemId === 'food_bowl');
  const bottle = cageItems.find((i) => i.itemId === 'water_bottle');

  // Total comfort bonus from placed furniture
  const furnitureComfort = Math.min(
    100,
    45 +
      cageItems.reduce((acc, it) => acc + (FURNITURE_CATALOG[it.itemId]?.comfortBonus ?? 0), 0) * 0.65
  );

  // Average cleanliness
  const avgClean =
    (state.cleaning.beddingClean +
      state.cleaning.litterClean +
      state.cleaning.bowlsClean +
      state.cleaning.shelvesClean +
      state.cleaning.hammockClean) /
    5;

  // Check perishable leftovers in bowl
  const now = Date.now();
  let leftoversCount = state.cleaning.leftoversCount;
  const updatedItems = state.placedItems.map((it) => {
    if (it.itemId === 'food_bowl' && it.perishableAt && now > it.perishableAt) {
      leftoversCount = Math.min(3, leftoversCount + 1);
      return { ...it, perishableAt: undefined, fillLevel: Math.max(0, (it.fillLevel ?? 20) - 25) };
    }
    return it;
  });

  // Update cleaning metrics gently
  const cleanDecay = (dtSeconds / 60) * (comfort ? 0.55 : 0.95) * (1 + state.rats.length * 0.14);
  const nextCleaning = {
    ...state.cleaning,
    beddingClean: Math.max(minClean, state.cleaning.beddingClean - cleanDecay),
    litterClean: Math.max(minClean, state.cleaning.litterClean - cleanDecay * 1.25),
    bowlsClean: Math.max(minClean, state.cleaning.bowlsClean - cleanDecay * 0.5),
    shelvesClean: Math.max(minClean, state.cleaning.shelvesClean - cleanDecay * 0.6),
    hammockClean: Math.max(minClean, state.cleaning.hammockClean - cleanDecay * 0.45),
    leftoversCount,
    familiarScent: Math.min(92, state.cleaning.familiarScent + dtSeconds * 0.08),
  };

  let nextBowlFill = bowl?.fillLevel ?? 0;
  let nextWaterFill = bottle?.fillLevel ?? 0;

  const newBabies: RatEntity[] = [];
  const passedMemories = [...state.memories];

  const survivingRats: RatEntity[] = [];

  for (const rat of state.rats) {
    let satiety = rat.satiety - (dtSeconds / 60) * (comfort ? 0.75 : 1.3);
    let hydration = rat.hydration - (dtSeconds / 60) * (comfort ? 0.85 : 1.45);
    let energy = rat.energy;

    // Auto-eat if bowl has food and rat is hungry
    if (satiety < 65 && nextBowlFill > 8) {
      satiety = Math.min(100, satiety + 14);
      nextBowlFill = Math.max(0, nextBowlFill - 6);
    }
    // Auto-drink if bottle has water
    if (hydration < 70 && nextWaterFill > 5) {
      hydration = Math.min(100, hydration + 18);
      nextWaterFill = Math.max(0, nextWaterFill - 4);
    }

    if (rat.behavior === 'sleep_hammock' || rat.behavior === 'sleep_house' || rat.behavior === 'cuddle_sleep') {
      energy = Math.min(100, energy + dtSeconds * 0.9);
    } else {
      energy = Math.max(20, energy - dtSeconds * 0.15);
    }

    satiety = Math.max(minStat, Math.min(100, satiety));
    hydration = Math.max(minStat, Math.min(100, hydration));

    // Social bond bonus if living with companions
    const hasFriends = state.rats.length >= 2;
    const scentPenalty = nextCleaning.familiarScent < 25 ? 8 : 0; // over-sterilization stress
    const targetComfort = Math.max(
      25,
      Math.min(100, furnitureComfort * 0.5 + avgClean * 0.35 + (hasFriends ? 18 : -8) - scentPenalty)
    );
    const nextComfort = rat.comfort + (targetComfort - rat.comfort) * 0.15;

    // Health depends on nutrition, water, cleanliness, rest, social life
    const conditionScore =
      satiety * 0.25 + hydration * 0.25 + avgClean * 0.25 + nextComfort * 0.25;
    let health = rat.health;
    let needsVet = rat.needsVet;
    let vetNote = rat.vetNote;

    if (comfort) {
      health = Math.max(85, Math.min(100, health + (conditionScore > 60 ? 0.5 : -0.1)));
      needsVet = false;
      vetNote = undefined;
    } else {
      if (conditionScore < 42 && !needsVet && Math.random() < 0.03) {
        needsVet = true;
        vetNote = 'Крыска слегка приуныла и чихает. Рекомендуем показать её игровому ветеринару.';
        notice = `${rat.name} чувствует лёгкое недомогание — загляните в карточку питомца для визита к ветеринару.`;
      }
      health = Math.max(
        35,
        Math.min(100, health + (needsVet ? -0.35 : conditionScore > 58 ? 0.45 : -0.25))
      );
    }

    // Gentle social bonding between compatible rats
    const nextRelationships = { ...rat.relationships };
    for (const other of state.rats) {
      if (other.id === rat.id) continue;
      const cur = nextRelationships[other.id] ?? 42;
      nextRelationships[other.id] = Math.min(100, cur + (dtSeconds / 60) * 0.6);
    }

    // Aging
    const ageStep = state.settings.agingEnabled ? dtSeconds / 180 : 0; // ~1 in-game day every 3 min
    const nextAge = rat.ageDays + ageStep;
    const nextStage = computeLifeStage(nextAge);

    // Optional natural death (ONLY when NOT in comfort mode AND explicitly enabled AND very old senior)
    if (
      !comfort &&
      state.settings.naturalDeathEnabled &&
      state.settings.agingEnabled &&
      nextAge > 920 &&
      Math.random() < 0.015
    ) {
      passedMemories.unshift({
        id: makeUid('mem'),
        ratName: rat.name,
        appearance: rat.appearance,
        personality: rat.personality,
        ageDays: Math.round(nextAge),
        favoriteToy: rat.favoriteToyType,
        learnedTricks: [...rat.learnedTricks],
        note: `${rat.name} прожила тёплую, счастливую жизнь в окружении заботы и друзей.`,
        savedAt: Date.now(),
      });
      notice = `${rat.name} тихо ушла на радугу в глубокой старости. Памятная карточка сохранена в Альбоме воспоминаний.`;
      continue;
    }

    // Optional delicate breeding progress (ONLY if explicitly enabled & paired by player)
    let pregnancyDays = rat.pregnancyDays;
    let mateId = rat.mateId;
    if (state.settings.breedingEnabled && pregnancyDays !== undefined) {
      pregnancyDays += dtSeconds / 35; // gentle paced pregnancy (~3-4 min)
      if (pregnancyDays >= 5) {
        const currentTotal = state.rats.length + newBabies.length;
        const canAdd = Math.max(0, Math.min(2, MAX_RATS_LIMIT - currentTotal));
        const mate = state.rats.find((r) => r.id === mateId);
        for (let b = 0; b < canAdd; b++) {
          const babyApp = mate
            ? inheritAppearance(rat.appearance, mate.appearance)
            : { ...rat.appearance };
          const babySex: RatSex = Math.random() < 0.5 ? 'female' : 'male';
          const baby = createRat({
            name: `Малыш ${rat.name.slice(0, 5)}${b + 1}`,
            sex: babySex,
            appearance: babyApp,
            ageDays: 14,
            parentNames: [rat.name, mate?.name ?? 'Неизвестно'],
            initialTrust: 35,
          });
          baby.relationships[rat.id] = 85;
          newBabies.push(baby);
        }
        pregnancyDays = undefined;
        mateId = undefined;
        if (canAdd > 0) {
          notice = `У ${rat.name} в уютном гнезде появились ${canAdd === 1 ? 'маленький крысёнок' : 'два здоровых крысёнка'}!`;
        }
      }
    }

    survivingRats.push({
      ...rat,
      ageDays: nextAge,
      lifeStage: nextStage,
      satiety: Math.round(satiety),
      hydration: Math.round(hydration),
      energy: Math.round(energy),
      comfort: Math.round(nextComfort),
      health: Math.round(health),
      needsVet,
      vetNote,
      relationships: nextRelationships,
      pregnancyDays,
      mateId,
    });
  }

  // Sync updated bowl & water levels back to items
  const finalItems = updatedItems.map((it) => {
    if (it.uid === bowl?.uid) return { ...it, fillLevel: Math.round(nextBowlFill) };
    if (it.uid === bottle?.uid) return { ...it, fillLevel: Math.round(nextWaterFill) };
    return it;
  });

  const nextState = evaluateQuestsAndAchievements({
    ...state,
    rats: [...survivingRats, ...newBabies],
    placedItems: finalItems,
    cleaning: nextCleaning,
    memories: passedMemories,
    inGameDay: state.inGameDay + dtSeconds / 240,
    lastActiveAt: now,
  });

  return { state: nextState, notice };
}
