import { GameState } from '../types/game';

export const SAVE_KEY = 'kryski_doma_save_v1';
export const BACKUP_KEY = 'kryski_doma_save_backup_v1';

export function saveGameState(state: GameState): boolean {
  try {
    const previous = localStorage.getItem(SAVE_KEY);
    const payload: GameState = {
      ...state,
      lastSavedAt: Date.now(),
      lastActiveAt: Date.now(),
    };
    const serialized = JSON.stringify(payload);
    // Keep rolling backup of previous valid state before overwriting
    if (previous && previous.length > 50) {
      localStorage.setItem(BACKUP_KEY, previous);
    }
    localStorage.setItem(SAVE_KEY, serialized);
    return true;
  } catch {
    return false;
  }
}

export function loadGameState(): { state: GameState | null; restoredFromBackup: boolean } {
  const tryParse = (raw: string | null): GameState | null => {
    if (!raw) return null;
    try {
      const parsed = JSON.parse(raw) as GameState;
      if (parsed && typeof parsed === 'object' && Array.isArray(parsed.rats) && Array.isArray(parsed.placedItems)) {
        return parsed;
      }
    } catch {
      return null;
    }
    return null;
  };

  const main = tryParse(localStorage.getItem(SAVE_KEY));
  if (main) {
    return { state: applyOfflineProgress(main), restoredFromBackup: false };
  }
  const backup = tryParse(localStorage.getItem(BACKUP_KEY));
  if (backup) {
    return { state: applyOfflineProgress(backup), restoredFromBackup: true };
  }
  return { state: null, restoredFromBackup: false };
}

export function clearGameState(): void {
  localStorage.removeItem(SAVE_KEY);
  localStorage.removeItem(BACKUP_KEY);
}

export function exportSaveJson(state: GameState): string {
  return JSON.stringify(
    {
      ...state,
      exportedAt: new Date().toISOString(),
    },
    null,
    2
  );
}

export function importSaveJson(jsonText: string): GameState | null {
  try {
    const parsed = JSON.parse(jsonText) as GameState;
    if (!parsed || !Array.isArray(parsed.rats) || !Array.isArray(parsed.placedItems) || !parsed.settings) {
      return null;
    }
    saveGameState(parsed);
    return parsed;
  } catch {
    return null;
  }
}

/**
 * Safe capped offline progress:
 * Even after weeks away, pets NEVER die or suffer mass harm.
 * In Comfort Mode, needs stay in a cozy safe range.
 */
export function applyOfflineProgress(state: GameState): GameState {
  const now = Date.now();
  const elapsedMs = Math.max(0, now - (state.lastActiveAt || now));
  const elapsedHours = Math.min(24, elapsedMs / (1000 * 60 * 60)); // Strictly capped at 24h!

  if (elapsedHours < 0.08) {
    return { ...state, lastActiveAt: now };
  }

  const comfort = state.settings.comfortMode;
  const minSatiety = comfort ? 52 : 34;
  const minHydration = comfort ? 58 : 40;
  const minClean = comfort ? 55 : 38;

  const bowl = state.placedItems.find((i) => i.itemId === 'food_bowl');
  const bottle = state.placedItems.find((i) => i.itemId === 'water_bottle');
  const hasFood = (bowl?.fillLevel ?? 0) > 15;
  const hasWater = (bottle?.fillLevel ?? 0) > 15;

  const updatedRats = state.rats.map((rat) => {
    const satDrop = hasFood ? elapsedHours * 1.4 : elapsedHours * 2.8;
    const hydDrop = hasWater ? elapsedHours * 1.1 : elapsedHours * 2.5;
    const energyGain = elapsedHours * 5;
    const ageDelta = state.settings.agingEnabled ? Math.min(2, elapsedHours / 18) : 0;
    const nextAge = rat.ageDays + ageDelta;
    return {
      ...rat,
      ageDays: nextAge,
      lifeStage: computeLifeStage(nextAge),
      satiety: Math.max(minSatiety, Math.round(rat.satiety - satDrop)),
      hydration: Math.max(minHydration, Math.round(rat.hydration - hydDrop)),
      energy: Math.min(100, Math.round(rat.energy + energyGain)),
    };
  });

  const cleanDrop = elapsedHours * (comfort ? 1.0 : 1.8);
  return {
    ...state,
    rats: updatedRats,
    cleaning: {
      ...state.cleaning,
      beddingClean: Math.max(minClean, Math.round(state.cleaning.beddingClean - cleanDrop)),
      litterClean: Math.max(minClean, Math.round(state.cleaning.litterClean - cleanDrop * 1.2)),
      bowlsClean: Math.max(minClean, Math.round(state.cleaning.bowlsClean - cleanDrop * 0.7)),
      shelvesClean: Math.max(minClean, Math.round(state.cleaning.shelvesClean - cleanDrop * 0.8)),
      hammockClean: Math.max(minClean, Math.round(state.cleaning.hammockClean - cleanDrop * 0.6)),
    },
    lastActiveAt: now,
  };
}

export function computeLifeStage(ageDays: number): 'baby' | 'teen' | 'adult' | 'senior' {
  if (ageDays < 45) return 'baby';
  if (ageDays < 110) return 'teen';
  if (ageDays < 520) return 'adult';
  return 'senior';
}
