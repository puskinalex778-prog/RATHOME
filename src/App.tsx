import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { soundEngine } from './audio/SoundEngine';
import { CleanActionId, CleaningModal } from './components/CleaningModal';
import { DecorModal } from './components/DecorModal';
import { MiniGamesModal } from './components/MiniGamesModal';
import { OnboardingFlow } from './components/OnboardingFlow';
import {
  AlbumPanel,
  FeedPanel,
  InteractPanel,
  PetsPanel,
  QuestsPanel,
  SettingsPanel,
  ShopPanel,
} from './components/Panels';
import { FOOD_CATALOG, FURNITURE_CATALOG, QUESTS_CATALOG, ROOM_THEMES } from './data/catalog';
import { PERSONALITIES } from './data/coats';
import { CageScene, DecorPreviewSpec, RatScreenLabel } from './scene/CageScene';
import {
  registerLifecycleListeners,
  scheduleFriendlyAwayNotifications,
  triggerHaptic,
} from './services/nativeBridge';
import {
  clearGameState,
  exportSaveJson,
  importSaveJson,
  loadGameState,
  saveGameState,
} from './services/saveSystem';
import {
  MAX_RATS_LIMIT,
  awardCoinsGuarded,
  createInitialGameState,
  createRat,
  evaluateQuestsAndAchievements,
  makeUid,
  stepSimulation,
} from './simulation/gameLogic';
import {
  ActiveZone,
  FoodType,
  FurnitureItemId,
  GameSettings,
  GameState,
  PlacedItem,
  RatAppearance,
  RatEntity,
  RatSex,
  RoomThemeId,
  TrickId,
} from './types/game';

type ActivePanel =
  | null
  | 'pets'
  | 'feed'
  | 'interact'
  | 'games'
  | 'clean'
  | 'shop'
  | 'decor'
  | 'quests'
  | 'album'
  | 'settings';

const CUTSCENE_STEPS = [
  { at: 0, text: 'Вы привезли малышей домой в уютной безопасной переноске...' },
  { at: 4.5, text: 'Крышка мягко открывается — крысята прислушиваются и шевелят усиками.' },
  { at: 9.5, text: 'Малыши осторожно выходят и знакомятся с новой просторной клеткой.' },
  { at: 15, text: 'Одна крыска заглядывает в деревянный домик, другая уже исследует гамак!' },
  { at: 20, text: 'Не торопитесь: наполните миску, проверьте водичку и дайте им привыкнуть к вашей руке.' },
];

export const App: React.FC = () => {
  const loaded = useMemo(() => loadGameState(), []);
  const [savedExists, setSavedExists] = useState<boolean>(!!loaded.state);
  const [showOnboarding, setShowOnboarding] = useState<boolean>(true);
  const [state, setState] = useState<GameState | null>(loaded.state);

  const [activePanel, setActivePanel] = useState<ActivePanel>(null);
  const [selectedRatId, setSelectedRatId] = useState<string | null>(loaded.state?.rats[0]?.id ?? null);
  const [followRatId, setFollowRatId] = useState<string | null>(null);
  const [petMode, setPetMode] = useState<boolean>(false);
  const [photoMode, setPhotoMode] = useState<boolean>(false);
  const [hudHidden, setHudHidden] = useState<boolean>(false);
  const [toast, setToast] = useState<string | null>(
    loaded.restoredFromBackup ? 'Сохранение аккуратно восстановлено из резервной копии.' : null
  );

  const [cutsceneRunning, setCutsceneRunning] = useState<boolean>(false);
  const [cutsceneStepIdx, setCutsceneStepIdx] = useState<number>(0);

  const [ratLabels, setRatLabels] = useState<RatScreenLabel[]>([]);
  const [briefTagRatId, setBriefTagRatId] = useState<string | null>(null);

  const viewportRef = useRef<HTMLDivElement | null>(null);
  const sceneRef = useRef<CageScene | null>(null);
  const stateRef = useRef<GameState | null>(state);
  stateRef.current = state;

  const showToast = useCallback((msg: string) => {
    setToast(msg);
  }, []);

  useEffect(() => {
    if (!toast) return;
    const t = window.setTimeout(() => setToast(null), 3600);
    return () => window.clearTimeout(t);
  }, [toast]);

  // Unlock Web Audio on first user interaction
  useEffect(() => {
    const unlock = () => {
      soundEngine.unlock();
      if (stateRef.current) {
        soundEngine.setVolumes(stateRef.current.settings.musicVolume, stateRef.current.settings.sfxVolume);
      }
      window.removeEventListener('pointerdown', unlock);
    };
    window.addEventListener('pointerdown', unlock);
    return () => window.removeEventListener('pointerdown', unlock);
  }, []);

  // Autosave whenever game state changes
  useEffect(() => {
    if (!state || showOnboarding) return;
    const id = window.setTimeout(() => {
      saveGameState(state);
      setSavedExists(true);
    }, 600);
    return () => window.clearTimeout(id);
  }, [state, showOnboarding]);

  // Lifecycle pause / resume & friendly away notifications
  useEffect(() => {
    return registerLifecycleListeners(
      () => {
        soundEngine.pause();
        sceneRef.current?.setPaused(true);
        if (stateRef.current) {
          saveGameState(stateRef.current);
          scheduleFriendlyAwayNotifications(stateRef.current.rats.map((r) => r.name));
        }
      },
      () => {
        soundEngine.resume();
        sceneRef.current?.setPaused(false);
      }
    );
  }, []);

  // Initialize Three.js 3D Scene once playing
  useEffect(() => {
    if (showOnboarding || !state || !viewportRef.current) return;
    if (sceneRef.current) return;

    const scene = new CageScene(viewportRef.current, {
      onSelectRat: (ratId) => {
        soundEngine.playSqueak();
        setSelectedRatId(ratId);
        setBriefTagRatId(ratId);
        if (stateRef.current) triggerHaptic(stateRef.current.settings.vibration, 'light');
      },
      onPetStroke: (ratId) => {
        soundEngine.playBrux();
        setState((prev) => {
          if (!prev) return prev;
          triggerHaptic(prev.settings.vibration, 'light');
          const rat = prev.rats.find((r) => r.id === ratId);
          if (!rat) return prev;
          const pers = PERSONALITIES[rat.personality];
          const trustDelta = Math.max(1, Math.round(2.5 * pers.trustGainMult));
          const updatedRats = prev.rats.map((r) =>
            r.id === ratId
              ? {
                  ...r,
                  trust: Math.min(100, r.trust + trustDelta),
                  comfort: Math.min(100, r.comfort + 2),
                  statusText: 'Тихо мурлычет от поглаживаний',
                }
              : r
          );
          const next = evaluateQuestsAndAchievements({
            ...prev,
            rats: updatedRats,
            stats: { ...prev.stats, petsGiven: prev.stats.petsGiven + 1 },
          });
          return next;
        });
      },
      onVoluntaryApproach: (ratId) => {
        soundEngine.playSqueak();
        setState((prev) => {
          if (!prev) return prev;
          const rat = prev.rats.find((r) => r.id === ratId);
          if (rat) {
            showToast(`${rat.name} сама подошла к вашей ладони и доверчиво её обнюхала! +6 к доверию`);
          }
          const updatedRats = prev.rats.map((r) =>
            r.id === ratId ? { ...r, trust: Math.min(100, r.trust + 6) } : r
          );
          const rewarded = awardCoinsGuarded(
            {
              ...prev,
              rats: updatedRats,
              stats: { ...prev.stats, voluntaryApproaches: prev.stats.voluntaryApproaches + 1 },
            },
            'voluntary_hand',
            10,
            20000
          );
          return evaluateQuestsAndAchievements(rewarded.state);
        });
      },
      onLabelsUpdate: (labels) => setRatLabels(labels),
      onBehaviorChange: (ratId, behavior, statusText) => {
        setState((prev) => {
          if (!prev) return prev;
          return {
            ...prev,
            rats: prev.rats.map((r) => (r.id === ratId ? { ...r, behavior, statusText } : r)),
          };
        });
      },
    });

    sceneRef.current = scene;

    // Immediately sync state & launch cutscene if brand-new family!
    scene.syncState({
      rats: state.rats,
      placedItems: state.placedItems,
      activeZone: state.activeZone,
      habitatLevel: state.habitatLevel,
      theme: state.theme,
      selectedRatId: state.rats[0]?.id ?? null,
      settings: state.settings,
    });

    if (!state.cutsceneCompleted) {
      setCutsceneRunning(true);
      setCutsceneStepIdx(0);
      scene.startArrivalCutscene();
    }

    return () => {
      scene.dispose();
      sceneRef.current = null;
    };
  }, [showOnboarding]);

  // Sync React GameState -> 3D Scene
  useEffect(() => {
    if (!state || !sceneRef.current) return;
    sceneRef.current.syncState({
      rats: state.rats,
      placedItems: state.placedItems,
      activeZone: state.activeZone,
      habitatLevel: state.habitatLevel,
      theme: state.theme,
      selectedRatId,
      settings: state.settings,
    });
    soundEngine.setVolumes(state.settings.musicVolume, state.settings.sfxVolume);
  }, [state, selectedRatId]);

  // Sync Cleaning mode carrier state into 3D Scene
  useEffect(() => {
    sceneRef.current?.setCleaningMode(activePanel === 'clean');
  }, [activePanel]);

  useEffect(() => {
    sceneRef.current?.setPetMode(petMode);
  }, [petMode]);

  useEffect(() => {
    sceneRef.current?.setFollowRat(followRatId);
  }, [followRatId]);

  // Brief floating name highlight timer when tapping a rat
  useEffect(() => {
    if (!briefTagRatId) return;
    const t = window.setTimeout(() => setBriefTagRatId(null), 4000);
    return () => window.clearTimeout(t);
  }, [briefTagRatId]);

  // Cutscene subtitle timeline (~25 seconds, always skippable!)
  useEffect(() => {
    if (!cutsceneRunning) return;
    const timers: number[] = [];
    CUTSCENE_STEPS.forEach((step, idx) => {
      if (idx === 0) return;
      timers.push(window.setTimeout(() => setCutsceneStepIdx(idx), step.at * 1000));
    });
    timers.push(
      window.setTimeout(() => {
        finishCutscene();
      }, 25000)
    );
    return () => timers.forEach((id) => window.clearTimeout(id));
  }, [cutsceneRunning]);

  const finishCutscene = useCallback(() => {
    setCutsceneRunning(false);
    sceneRef.current?.stopCutscene();
    setState((prev) => (prev ? { ...prev, cutsceneCompleted: true } : prev));
    showToast('Добро пожаловать домой! Загляните в «Задания» для первых шагов.');
  }, [showToast]);

  // Periodic background simulation tick (every 4 seconds while active)
  useEffect(() => {
    if (showOnboarding || !state || cutsceneRunning) return;
    const interval = window.setInterval(() => {
      setState((prev) => {
        if (!prev) return prev;
        const { state: next, notice } = stepSimulation(prev, 4);
        if (notice) showToast(notice);
        return next;
      });
    }, 4000);
    return () => window.clearInterval(interval);
  }, [showOnboarding, cutsceneRunning, showToast]);

  // --- Onboarding handlers ---
  const handleContinueSaved = () => {
    soundEngine.unlock();
    soundEngine.playClick();
    if (state) {
      setSelectedRatId(state.rats[0]?.id ?? null);
      setShowOnboarding(false);
    }
  };

  const handleConfirmStarterPair = (rat1: RatEntity, rat2: RatEntity) => {
    soundEngine.unlock();
    soundEngine.playSuccess();
    const fresh = createInitialGameState(rat1, rat2);
    saveGameState(fresh);
    setState(fresh);
    setSavedExists(true);
    setSelectedRatId(rat1.id);
    setShowOnboarding(false);
  };

  // --- Gameplay Actions ---
  const handleFeed = (food: FoodType) => {
    if (!state) return;
    const def = FOOD_CATALOG[food];
    if ((state.foodStock[food] ?? 0) <= 0) return;

    const bowl = state.placedItems.find((i) => i.zone === 'cage' && i.itemId === 'food_bowl');
    const avgSatiety = state.rats.reduce((s, r) => s + r.satiety, 0) / Math.max(1, state.rats.length);

    if (avgSatiety >= 96 && (bowl?.fillLevel ?? 0) >= 92) {
      showToast('Крыски уже сыты, а миска полная — лучше не перекармливать, угостите чуть позже!');
      return;
    }

    soundEngine.playCrunch();
    triggerHaptic(state.settings.vibration, 'light');

    setState((prev) => {
      if (!prev) return prev;
      const bowlBefore = prev.placedItems.find((i) => i.zone === 'cage' && i.itemId === 'food_bowl')?.fillLevel ?? 0;
      const updatedItems = prev.placedItems.map((it) =>
        it.zone === 'cage' && it.itemId === 'food_bowl'
          ? {
              ...it,
              fillLevel: Math.min(100, (it.fillLevel ?? 0) + (def.isStaple ? 55 : 28)),
              foodKind: food,
              perishableAt: def.perishable ? Date.now() + 1000 * 60 * 5 : it.perishableAt,
            }
          : it
      );
      const updatedRats = prev.rats.map((r) => ({
        ...r,
        satiety: Math.min(100, r.satiety + Math.round(def.satietyRestore * 0.65)),
        trust: Math.min(100, r.trust + def.trustBonus),
      }));
      const nextQuests = { ...prev.quests };
      if (def.isStaple && nextQuests.q_fill_bowl) {
        nextQuests.q_fill_bowl = { ...nextQuests.q_fill_bowl, progress: 1, completed: true };
      }

      let nextState: GameState = {
        ...prev,
        placedItems: updatedItems,
        rats: updatedRats,
        foodStock: { ...prev.foodStock, [food]: Math.max(0, (prev.foodStock[food] ?? 1) - 1) },
        quests: nextQuests,
        stats: {
          ...prev.stats,
          treatsGiven: prev.stats.treatsGiven + (def.isStaple ? 0 : 1),
        },
      };

      // Anti-exploit: only grant care coins if bowl wasn't already nearly full
      if (bowlBefore < 75) {
        const res = awardCoinsGuarded(nextState, 'care_feed', 8, 25000);
        nextState = res.state;
        if (res.granted > 0) showToast(`Миска наполнена (${def.name})! +${res.granted} монет`);
        else showToast(`Вы покормили крысок: ${def.name}`);
      } else {
        showToast(`Добавили немного угощения (${def.name}).`);
      }

      return evaluateQuestsAndAchievements(nextState);
    });

    if (state.rats[0]) {
      sceneRef.current?.triggerRatAction(state.rats[0].id, 'eat', 5.5);
    }
  };

  const handleRefillWater = () => {
    if (!state) return;
    soundEngine.playWater();
    triggerHaptic(state.settings.vibration, 'light');

    setState((prev) => {
      if (!prev) return prev;
      const bottleBefore = prev.placedItems.find((i) => i.zone === 'cage' && i.itemId === 'water_bottle')?.fillLevel ?? 0;
      const updatedItems = prev.placedItems.map((it) =>
        it.itemId === 'water_bottle' ? { ...it, fillLevel: 100 } : it
      );
      const updatedRats = prev.rats.map((r) => ({ ...r, hydration: Math.min(100, r.hydration + 25) }));
      const nextQuests = { ...prev.quests };
      if (nextQuests.q_check_water) {
        nextQuests.q_check_water = { ...nextQuests.q_check_water, progress: 1, completed: true };
      }
      let nextState: GameState = {
        ...prev,
        placedItems: updatedItems,
        rats: updatedRats,
        quests: nextQuests,
      };
      if (bottleBefore < 80) {
        const res = awardCoinsGuarded(nextState, 'care_water', 8, 25000);
        nextState = res.state;
        showToast(res.granted > 0 ? `Свежая чистая водичка налита! +${res.granted} монет` : 'Вода в поилке обновлена!');
      } else {
        showToast('Вода в поилке свежая и чистая!');
      }
      return evaluateQuestsAndAchievements(nextState);
    });
    if (state.rats[0]) sceneRef.current?.triggerRatAction(state.rats[0].id, 'drink', 4);
  };

  const handlePerformClean = (action: CleanActionId) => {
    soundEngine.playCleanBrush();
    setState((prev) => {
      if (!prev) return prev;
      triggerHaptic(prev.settings.vibration, 'light');
      const c = { ...prev.cleaning };
      if (action === 'bedding') {
        c.beddingClean = 96;
        c.familiarScent = Math.max(35, c.familiarScent - 10);
      } else if (action === 'litter') {
        c.litterClean = 98;
      } else if (action === 'bowls') {
        c.bowlsClean = 100;
      } else if (action === 'shelves') {
        c.shelvesClean = 98;
        c.familiarScent = Math.max(35, c.familiarScent - 6);
      } else if (action === 'hammock') {
        c.hammockClean = 100;
        c.familiarScent = Math.max(30, c.familiarScent - 8);
      } else if (action === 'leftovers') {
        c.leftoversCount = 0;
      } else if (action === 'playpen') {
        c.playpenClean = 100;
      }

      const res = awardCoinsGuarded(
        {
          ...prev,
          cleaning: c,
          stats: { ...prev.stats, cleaningsDone: prev.stats.cleaningsDone + 1 },
        },
        `clean_${action}`,
        12,
        25000
      );
      showToast(res.granted > 0 ? `Чисто и уютно! +${res.granted} монет` : 'Уборка завершена бережно!');
      return evaluateQuestsAndAchievements(res.state);
    });
  };

  const handleBuyFurniture = (id: FurnitureItemId) => {
    const def = FURNITURE_CATALOG[id];
    if (!state || state.coins < def.price) return;
    soundEngine.playCoin();
    setState((prev) => {
      if (!prev || prev.coins < def.price) return prev;
      return {
        ...prev,
        coins: prev.coins - def.price,
        inventory: {
          ...prev.inventory,
          [id]: (prev.inventory[id] ?? 0) + 1,
        },
      };
    });
    showToast(`Куплено: ${def.name}! Откройте «Обустройство», чтобы поставить в клетку.`);
  };

  const handleBuyFood = (id: FoodType) => {
    const def = FOOD_CATALOG[id];
    if (!state || state.coins < def.price) return;
    soundEngine.playCoin();
    setState((prev) => {
      if (!prev || prev.coins < def.price) return prev;
      return {
        ...prev,
        coins: prev.coins - def.price,
        foodStock: {
          ...prev.foodStock,
          [id]: (prev.foodStock[id] ?? 0) + def.packAmount,
        },
      };
    });
    showToast(`Запасы пополнены: ${def.name} (+${def.packAmount})`);
  };

  const handlePlaceNew = (item: Omit<PlacedItem, 'uid'>) => {
    soundEngine.playClick();
    setState((prev) => {
      if (!prev) return prev;
      const curCount = prev.inventory[item.itemId] ?? 0;
      if (curCount <= 0) return prev;
      const nextInv = { ...prev.inventory, [item.itemId]: curCount - 1 };
      if (nextInv[item.itemId]! <= 0) delete nextInv[item.itemId];

      const nextQuests = { ...prev.quests };
      if (FURNITURE_CATALOG[item.itemId].isRestSpot && nextQuests.q_add_hideout) {
        nextQuests.q_add_hideout = { ...nextQuests.q_add_hideout, progress: 1, completed: true };
      }

      const placed: PlacedItem = { ...item, uid: makeUid('item') };
      showToast(`${FURNITURE_CATALOG[item.itemId].name} установлен! Крыски уже присматриваются.`);
      return evaluateQuestsAndAchievements({
        ...prev,
        placedItems: [...prev.placedItems, placed],
        inventory: nextInv,
        quests: nextQuests,
      });
    });
  };

  const handleUpdatePlaced = (uid: string, patch: Partial<PlacedItem>) => {
    soundEngine.playClick();
    setState((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        placedItems: prev.placedItems.map((it) => (it.uid === uid ? { ...it, ...patch } : it)),
      };
    });
    showToast('Положение предмета обновлено!');
  };

  const handleStowToInventory = (uid: string) => {
    soundEngine.playClick();
    setState((prev) => {
      if (!prev) return prev;
      const target = prev.placedItems.find((i) => i.uid === uid);
      if (!target) return prev;
      return {
        ...prev,
        placedItems: prev.placedItems.filter((i) => i.uid !== uid),
        inventory: {
          ...prev.inventory,
          [target.itemId]: (prev.inventory[target.itemId] ?? 0) + 1,
        },
      };
    });
    showToast('Предмет аккуратно убран в инвентарь.');
  };

  const handleDecorPreview = useCallback((preview: DecorPreviewSpec | null) => {
    sceneRef.current?.setDecorPreview(preview);
  }, []);

  const handleAdoptRat = (name: string, sex: RatSex, appearance: RatAppearance) => {
    if (!state || state.coins < 50 || state.rats.length >= MAX_RATS_LIMIT) return;
    soundEngine.playSuccess();
    const baby = createRat({ name, sex, appearance, ageDays: 30, initialTrust: 20 });
    setState((prev) => {
      if (!prev) return prev;
      const discovered = [...prev.discoveredPresets];
      if (appearance.presetId !== 'custom' && !discovered.includes(appearance.presetId)) {
        discovered.push(appearance.presetId);
      }
      // Establish initial friendly curiosity with existing cagemates
      const updatedExisting = prev.rats.map((r) => ({
        ...r,
        relationships: { ...r.relationships, [baby.id]: 42 },
      }));
      updatedExisting.forEach((r) => {
        baby.relationships[r.id] = 42;
      });
      return evaluateQuestsAndAchievements({
        ...prev,
        coins: prev.coins - 50,
        rats: [...updatedExisting, baby],
        discoveredPresets: discovered,
      });
    });
    setSelectedRatId(baby.id);
    showToast(`${name} переехала в ваш уютный дом!`);
  };

  const handleClaimQuest = (questId: string) => {
    const def = QUESTS_CATALOG.find((q) => q.id === questId);
    if (!def || !state) return;
    soundEngine.playCoin();
    setState((prev) => {
      if (!prev) return prev;
      const q = prev.quests[questId];
      if (!q || !q.completed || q.claimed) return prev;
      return {
        ...prev,
        coins: prev.coins + def.rewardCoins,
        quests: {
          ...prev.quests,
          [questId]: { ...q, claimed: true },
        },
      };
    });
    showToast(`Награда получена: +${def.rewardCoins} монет!`);
  };

  const handleTakePhoto = () => {
    if (!sceneRef.current || !state) return;
    soundEngine.playShutter();
    triggerHaptic(state.settings.vibration, 'medium');
    const dataUrl = sceneRef.current.capturePhotoDataUrl();
    const names = state.rats.map((r) => r.name);
    setState((prev) => {
      if (!prev) return prev;
      const entry = {
        id: makeUid('photo'),
        dataUrl,
        caption: `${names.slice(0, 2).join(' и ')} — уютный момент`,
        ratNames: names,
        createdAt: Date.now(),
      };
      return evaluateQuestsAndAchievements({
        ...prev,
        photos: [entry, ...prev.photos].slice(0, 18),
        stats: { ...prev.stats, photosTaken: prev.stats.photosTaken + 1 },
      });
    });
    showToast('Фотография сохранена в Альбом!');
  };

  const handleExportBackup = () => {
    if (!state) return;
    const text = exportSaveJson(state);
    const blob = new Blob([text], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `kryski-doma-backup-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    showToast('Резервная копия сохранения скачана!');
  };

  const handleImportBackup = (json: string) => {
    const restored = importSaveJson(json);
    if (restored) {
      setState(restored);
      setSelectedRatId(restored.rats[0]?.id ?? null);
      showToast('Сохранение успешно восстановлено!');
    } else {
      showToast('Не удалось прочитать файл сохранения. Проверьте формат JSON.');
    }
  };

  const handleResetGame = () => {
    if (!window.confirm('Вы уверены, что хотите начать заново? Текущее сохранение будет очищено.')) return;
    clearGameState();
    sceneRef.current?.dispose();
    sceneRef.current = null;
    setState(null);
    setSavedExists(false);
    setActivePanel(null);
    setShowOnboarding(true);
  };

  // Unclaimed completed quests badge count
  const claimableQuests = state
    ? Object.values(state.quests).filter((q) => q.completed && !q.claimed).length
    : 0;

  if (showOnboarding || !state) {
    return (
      <OnboardingFlow
        hasSavedGame={savedExists && !!state}
        onContinueSaved={handleContinueSaved}
        onConfirmPair={handleConfirmStarterPair}
      />
    );
  }

  // Exact 10 main Russian navigation buttons
  const navButtons: { id: ActivePanel; label: string; sprite: string; badge?: number }[] = [
    { id: 'pets', label: 'Питомцы', sprite: 'pets', badge: state.rats.some((r) => r.needsVet) ? 1 : undefined },
    { id: 'feed', label: 'Корм', sprite: 'pellet_food' },
    { id: 'interact', label: 'Общение', sprite: 'trust' },
    { id: 'games', label: 'Игры', sprite: 'training_target' },
    { id: 'clean', label: 'Уборка', sprite: 'sponge' },
    { id: 'shop', label: 'Магазин', sprite: 'shop' },
    { id: 'decor', label: 'Обустройство', sprite: 'wood_house' },
    { id: 'quests', label: 'Задания', sprite: 'quests', badge: claimableQuests || undefined },
    { id: 'album', label: 'Фото', sprite: 'camera' },
    { id: 'settings', label: 'Настройки', sprite: 'settings' },
  ];

  return (
    <div className={`app-shell ${state.settings.reducedMotion ? 'reduced-motion' : ''}`}>
      {/* Fullscreen Interactive 3D Canvas */}
      <div ref={viewportRef} className="viewport-3d" />

      {/* Floating Rat Name Labels (hidden in Photo Mode & Cutscene) */}
      {!photoMode && !cutsceneRunning && (
        <div className="rat-labels-layer">
          {ratLabels.map((lbl) => {
            if (!lbl.visible) return null;
            const isSelected = lbl.id === selectedRatId;
            const showFull = isSelected || lbl.id === briefTagRatId;
            if (!showFull && hudHidden) return null;
            return (
              <div
                key={lbl.id}
                className={`rat-name-tag ${isSelected ? 'selected' : ''}`}
                style={{ left: lbl.x, top: lbl.y }}
                onClick={() => {
                  setSelectedRatId(lbl.id);
                  setActivePanel('pets');
                }}
              >
                <span>{lbl.name}</span>
                {showFull && <small>{lbl.behaviorLabel}</small>}
              </div>
            );
          })}
        </div>
      )}

      {/* Toast Message */}
      {toast && <div className="toast-banner">{toast}</div>}

      {/* Opening 3D Arrival Cutscene Overlay (always skippable!) */}
      {cutsceneRunning && (
        <div className="cutscene-overlay">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span className="hud-pill">Знакомство с новым домом</span>
            <button type="button" className="btn btn-outline btn-sm" onClick={finishCutscene}>
              Пропустить ⏭
            </button>
          </div>
          <div className="cutscene-caption">
            {CUTSCENE_STEPS[cutsceneStepIdx]?.text}
          </div>
        </div>
      )}

      {/* Clean HUD-less Photo Mode */}
      {photoMode && (
        <div className="photo-overlay">
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <button type="button" className="btn btn-outline btn-sm" onClick={() => setPhotoMode(false)}>
              ← Вернуться
            </button>
            <span className="hud-pill">Крутите камеру пальцем для лучшего кадра</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'center' }}>
            <button type="button" className="shutter-btn" onClick={handleTakePhoto} aria-label="Сделать снимок">
              <img src="./assets/sprites/camera.png" alt="Снимок" style={{ width: 34, height: 34 }} />
            </button>
          </div>
        </div>
      )}

      {/* Main Cozy HUD (hidden during Cutscene or Photo Mode) */}
      {!photoMode && !cutsceneRunning && (
        <>
          <div className="hud-top">
            <div className="hud-group">
              <button
                type="button"
                className="hud-pill"
                onClick={() => {
                  soundEngine.playClick();
                  setActivePanel('shop');
                }}
              >
                <img src="./assets/sprites/coin.png" alt="Монеты" />
                <span>{state.coins}</span>
              </button>

              <button
                type="button"
                className={`hud-pill ${state.activeZone === 'cage' ? 'active' : ''}`}
                onClick={() => {
                  soundEngine.playClick();
                  setState((p) => (p ? { ...p, activeZone: 'cage' } : p));
                }}
              >
                Клетка {state.habitatLevel} яруса
              </button>

              {state.playpenUnlocked && (
                <button
                  type="button"
                  className={`hud-pill ${state.activeZone === 'playpen' ? 'active' : ''}`}
                  onClick={() => {
                    soundEngine.playClick();
                    setState((p) => (p ? { ...p, activeZone: 'playpen' } : p));
                  }}
                >
                  Манеж
                </button>
              )}
            </div>

            <div className="hud-group">
              {petMode && (
                <button
                  type="button"
                  className="hud-pill active"
                  style={{ background: 'var(--terracotta)', borderColor: '#A85C42' }}
                  onClick={() => setPetMode(false)}
                >
                  Поглаживание: гладьте крыску (Выкл)
                </button>
              )}
              <button
                type="button"
                className="hud-pill"
                onClick={() => setHudHidden((h) => !h)}
              >
                {hudHidden ? 'Показать меню' : 'Наблюдение'}
              </button>
            </div>
          </div>

          {/* Right Camera Controls */}
          {!hudHidden && (
            <div className="camera-strip">
              <button
                type="button"
                className="icon-circle-btn"
                title="Общий обзор"
                onClick={() => {
                  setFollowRatId(null);
                  sceneRef.current?.setCameraPreset('overview');
                }}
              >
                Обзор
              </button>
              <button
                type="button"
                className="icon-circle-btn"
                title="На уровне питомца"
                onClick={() => {
                  setFollowRatId(null);
                  sceneRef.current?.setCameraPreset('pet_level');
                }}
              >
                Близко
              </button>
              <button
                type="button"
                className={`icon-circle-btn ${followRatId ? 'active' : ''}`}
                title="Следить за выбранной крыской"
                onClick={() => {
                  if (followRatId) {
                    setFollowRatId(null);
                    sceneRef.current?.setCameraPreset('overview');
                  } else if (selectedRatId) {
                    setFollowRatId(selectedRatId);
                    sceneRef.current?.setCameraPreset('closeup');
                  }
                }}
              >
                Следить
              </button>
            </div>
          )}

          {/* Bottom 10-Button Navigation Bar */}
          {!hudHidden && activePanel !== 'decor' && (
            <div className="hud-bottom-wrap">
              <nav className="nav-dock" aria-label="Главное меню">
                {navButtons.map((btn) => (
                  <button
                    key={btn.id}
                    type="button"
                    className={`nav-btn ${activePanel === btn.id ? 'active' : ''}`}
                    onClick={() => {
                      soundEngine.playClick();
                      triggerHaptic(state.settings.vibration, 'light');
                      setActivePanel((cur) => (cur === btn.id ? null : btn.id));
                    }}
                  >
                    <img src={`./assets/sprites/${btn.sprite}.png`} alt={btn.label} />
                    <span>{btn.label}</span>
                    {btn.badge !== undefined && <span className="nav-badge">{btn.badge}</span>}
                  </button>
                ))}
              </nav>
            </div>
          )}
        </>
      )}

      {/* === ACTIVE MODALS / PANELS === */}
      {activePanel === 'pets' && (
        <PetsPanel
          state={state}
          selectedRatId={selectedRatId}
          onSelectRat={(id) => setSelectedRatId(id)}
          onRenameRat={(id, name) => {
            setState((p) =>
              p ? { ...p, rats: p.rats.map((r) => (r.id === id ? { ...r, name } : r)) } : p
            );
            showToast(`Новое имя сохранено: ${name}!`);
          }}
          onVetVisit={(id) => {
            if (state.coins < 20) {
              showToast('Нужно 20 монет для осмотра у игрового ветеринара.');
              return;
            }
            soundEngine.playSuccess();
            setState((p) =>
              p
                ? {
                    ...p,
                    coins: p.coins - 20,
                    rats: p.rats.map((r) =>
                      r.id === id ? { ...r, needsVet: false, vetNote: undefined, health: 96 } : r
                    ),
                    stats: { ...p.stats, vetVisits: p.stats.vetVisits + 1 },
                  }
                : p
            );
            showToast('Ветеринар бережно осмотрел крыску — она чувствует себя отлично!');
          }}
          onAdoptRat={handleAdoptRat}
          onStartPairing={(femaleId, maleId) => {
            setState((p) =>
              p
                ? {
                    ...p,
                    rats: p.rats.map((r) =>
                      r.id === femaleId ? { ...r, pregnancyDays: 0, mateId: maleId } : r
                    ),
                  }
                : p
            );
            showToast('Уютное гнездо подготовлено! Скоро появятся малыши.');
          }}
          onRehomeBaby={(ratId) => {
            const target = state.rats.find((r) => r.id === ratId);
            setState((p) =>
              p
                ? {
                    ...p,
                    rats: p.rats.filter((r) => r.id !== ratId),
                    stats: { ...p.stats, rehomedBabies: p.stats.rehomedBabies + 1 },
                  }
                : p
            );
            if (target) {
              showToast(`${target.name} переехал в заботливую игровую семью!`);
            }
          }}
          onFocusRat={(id) => {
            setSelectedRatId(id);
            setFollowRatId(id);
            sceneRef.current?.setCameraPreset('closeup');
          }}
          onClose={() => setActivePanel(null)}
        />
      )}

      {activePanel === 'feed' && (
        <FeedPanel
          state={state}
          onFeed={handleFeed}
          onRefillWater={handleRefillWater}
          onClose={() => setActivePanel(null)}
        />
      )}

      {activePanel === 'interact' && (
        <InteractPanel
          state={state}
          selectedRatId={selectedRatId}
          petMode={petMode}
          onTogglePetMode={() => {
            setPetMode((v) => {
              const next = !v;
              if (next) showToast('Мягко проводите пальцем по крыске, чтобы погладить её!');
              return next;
            });
          }}
          onOfferHand={() => {
            soundEngine.playClick();
            sceneRef.current?.offerHand();
            showToast('Вы спокойно поднесли ладонь — подождите, пока крыска сама решит подойти!');
          }}
          onCallRat={(id) => {
            soundEngine.playCallWhistle();
            sceneRef.current?.callRatByName(id);
            const r = state.rats.find((x) => x.id === id);
            showToast(`Вы нежно позвали ${r?.name ?? 'крыску'} по имени!`);
          }}
          onGiveHandTreat={(id) => {
            const foodKey: FoodType = state.foodStock.game_treat > 0 ? 'game_treat' : 'fruit_treat';
            if ((state.foodStock[foodKey] ?? 0) <= 0) return;
            soundEngine.playCrunch();
            sceneRef.current?.triggerRatAction(id, 'eat', 4.5);
            setState((p) =>
              p
                ? evaluateQuestsAndAchievements({
                    ...p,
                    foodStock: { ...p.foodStock, [foodKey]: Math.max(0, (p.foodStock[foodKey] ?? 1) - 1) },
                    rats: p.rats.map((r) =>
                      r.id === id
                        ? { ...r, trust: Math.min(100, r.trust + 6), satiety: Math.min(100, r.satiety + 10) }
                        : r
                    ),
                    stats: { ...p.stats, treatsGiven: p.stats.treatsGiven + 1 },
                  })
                : p
            );
            showToast('Крыска аккуратно взяла лакомство передними лапками! +6 к доверию');
          }}
          onSwitchZone={(zone: ActiveZone) => {
            setState((p) => (p ? { ...p, activeZone: zone } : p));
            showToast(zone === 'playpen' ? 'Крыски на прогулке в защищённом манеже!' : 'Крыски вернулись в свою клетку.');
          }}
          onClose={() => setActivePanel(null)}
        />
      )}

      {activePanel === 'games' && (
        <MiniGamesModal
          rats={state.rats}
          selectedRatId={selectedRatId}
          gameTreats={state.foodStock.game_treat ?? 0}
          onClose={() => setActivePanel(null)}
          onTrigger3DTrick={(ratId, trick: TrickId) => {
            soundEngine.playSqueak();
            if (trick === 'spin') sceneRef.current?.triggerRatAction(ratId, 'trick_spin', 3.5);
            else if (trick === 'fetch_ball') sceneRef.current?.triggerRatAction(ratId, 'trick_ball', 4.5);
            else if (trick === 'come_when_called') sceneRef.current?.callRatByName(ratId);
            else sceneRef.current?.triggerRatAction(ratId, 'trick_target', 3.5);
          }}
          onCompleteGame={({ ratId, rewardCoins, trustGain, learnedTrick, useTreat, message }) => {
            soundEngine.playSuccess();
            setState((p) => {
              if (!p) return p;
              const nextRats = p.rats.map((r) => {
                if (r.id !== ratId) return r;
                const tricks =
                  learnedTrick && !r.learnedTricks.includes(learnedTrick)
                    ? [...r.learnedTricks, learnedTrick]
                    : r.learnedTricks;
                return {
                  ...r,
                  trust: Math.min(100, r.trust + trustGain),
                  energy: Math.max(15, r.energy - 9),
                  learnedTricks: tricks,
                };
              });
              return evaluateQuestsAndAchievements({
                ...p,
                coins: p.coins + rewardCoins,
                rats: nextRats,
                foodStock: useTreat
                  ? { ...p.foodStock, game_treat: Math.max(0, (p.foodStock.game_treat ?? 0) - 1) }
                  : p.foodStock,
                stats: { ...p.stats, minigamesWon: p.stats.minigamesWon + 1 },
              });
            });
            showToast(message);
          }}
        />
      )}

      {activePanel === 'clean' && (
        <CleaningModal
          cleaning={state.cleaning}
          playpenUnlocked={state.playpenUnlocked}
          onPerformClean={handlePerformClean}
          onClose={() => setActivePanel(null)}
        />
      )}

      {activePanel === 'shop' && (
        <ShopPanel
          state={state}
          onBuyFurniture={handleBuyFurniture}
          onBuyFood={handleBuyFood}
          onBuyTheme={(id: RoomThemeId) => {
            const th = ROOM_THEMES[id];
            if (state.coins < th.price) return;
            soundEngine.playSuccess();
            setState((p) =>
              p
                ? {
                    ...p,
                    coins: p.coins - th.price,
                    theme: id,
                    unlockedThemes: [...p.unlockedThemes, id],
                  }
                : p
            );
            showToast(`Тема «${th.name}» открыта и применена!`);
          }}
          onSelectTheme={(id: RoomThemeId) => {
            soundEngine.playClick();
            setState((p) => (p ? { ...p, theme: id } : p));
            showToast(`Оформление изменено: ${ROOM_THEMES[id].name}`);
          }}
          onUpgradeCage3={() => {
            if (state.coins < 160) return;
            soundEngine.playSuccess();
            setState((p) =>
              p ? evaluateQuestsAndAchievements({ ...p, coins: p.coins - 160, habitatLevel: 3 }) : p
            );
            showToast('Поздравляем! У ваших крысок теперь просторная 3-ярусная клетка!');
          }}
          onUnlockPlaypen={() => {
            if (state.coins < 110) return;
            soundEngine.playSuccess();
            setState((p) =>
              p
                ? evaluateQuestsAndAchievements({
                    ...p,
                    coins: p.coins - 110,
                    playpenUnlocked: true,
                    activeZone: 'playpen',
                  })
                : p
            );
            showToast('Защищённый игровой манеж открыт! Можно устраивать безопасные прогулки.');
          }}
          onOpenAdopt={() => setActivePanel('pets')}
          onClose={() => setActivePanel(null)}
        />
      )}

      {activePanel === 'decor' && (
        <DecorModal
          activeZone={state.activeZone}
          habitatLevel={state.habitatLevel}
          placedItems={state.placedItems}
          inventory={state.inventory}
          onPlaceNew={handlePlaceNew}
          onUpdatePlaced={handleUpdatePlaced}
          onStowToInventory={handleStowToInventory}
          onPreviewChange={handleDecorPreview}
          onClose={() => setActivePanel(null)}
        />
      )}

      {activePanel === 'quests' && (
        <QuestsPanel
          state={state}
          onClaimQuest={handleClaimQuest}
          onClose={() => setActivePanel(null)}
        />
      )}

      {activePanel === 'album' && (
        <AlbumPanel
          state={state}
          onEnterPhotoMode={() => {
            setActivePanel(null);
            setPhotoMode(true);
          }}
          onDeletePhoto={(id) =>
            setState((p) => (p ? { ...p, photos: p.photos.filter((x) => x.id !== id) } : p))
          }
          onClose={() => setActivePanel(null)}
        />
      )}

      {activePanel === 'settings' && (
        <SettingsPanel
          settings={state.settings}
          onUpdateSettings={(patch: Partial<GameSettings>) => {
            setState((p) => (p ? { ...p, settings: { ...p.settings, ...patch } } : p));
          }}
          onExportBackup={handleExportBackup}
          onImportBackup={handleImportBackup}
          onResetGame={handleResetGame}
          onClose={() => setActivePanel(null)}
        />
      )}
    </div>
  );
};
