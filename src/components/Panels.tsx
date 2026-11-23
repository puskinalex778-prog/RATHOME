import React, { useState } from 'react';
import {
  ACHIEVEMENTS_CATALOG,
  FOOD_CATALOG,
  FURNITURE_CATALOG,
  QUESTS_CATALOG,
  ROOM_THEMES,
  TRICKS_CATALOG,
} from '../data/catalog';
import {
  COAT_PRESETS,
  PERSONALITIES,
  SUGGESTED_NAMES_FEMALE,
  SUGGESTED_NAMES_MALE,
  describeAppearance,
  getPresetSprite,
} from '../data/coats';
import { MAX_RATS_LIMIT, createStarterAppearance1 } from '../simulation/gameLogic';
import {
  FoodType,
  FurnitureItemId,
  GameSettings,
  GameState,
  RatAppearance,
  RatSex,
  RoomThemeId,
} from '../types/game';
import { RatAppearanceEditor } from './RatAppearanceEditor';

const STAGE_RU: Record<string, string> = {
  baby: 'Крысёныш',
  teen: 'Подросток',
  adult: 'Взрослая крыска',
  senior: 'Пожилая крыска',
};

const StatBar: React.FC<{ label: string; value: number }> = ({ label, value }) => (
  <div className="stat-row">
    <span className="stat-label">{label}</span>
    <div className="stat-bar">
      <div
        className={`stat-fill ${value < 35 ? 'low' : value < 60 ? 'warn' : ''}`}
        style={{ width: `${Math.max(0, Math.min(100, value))}%` }}
      />
    </div>
    <span style={{ width: 34, textAlign: 'right' }}>{Math.round(value)}%</span>
  </div>
);

/* ================= 1. PETS & PET CARD PANEL ================= */
interface PetsPanelProps {
  state: GameState;
  selectedRatId: string | null;
  onSelectRat: (id: string) => void;
  onRenameRat: (id: string, name: string) => void;
  onVetVisit: (id: string) => void;
  onAdoptRat: (name: string, sex: RatSex, appearance: RatAppearance) => void;
  onStartPairing: (femaleId: string, maleId: string) => void;
  onRehomeBaby: (ratId: string) => void;
  onFocusRat: (ratId: string) => void;
  onClose: () => void;
}

export const PetsPanel: React.FC<PetsPanelProps> = ({
  state,
  selectedRatId,
  onSelectRat,
  onRenameRat,
  onVetVisit,
  onAdoptRat,
  onStartPairing,
  onRehomeBaby,
  onFocusRat,
  onClose,
}) => {
  const [adopting, setAdopting] = useState(false);
  const [newName, setNewName] = useState('Бусинка');
  const [newSex, setNewSex] = useState<RatSex>(state.rats[0]?.sex ?? 'female');
  const [newApp, setNewApp] = useState<RatAppearance>(() => createStarterAppearance1());
  const [editingName, setEditingName] = useState(false);
  const [nameDraft, setNameDraft] = useState('');

  const rat = state.rats.find((r) => r.id === selectedRatId) || state.rats[0];

  const handleAdoptConfirm = () => {
    onAdoptRat(newName.trim() || 'Крыска', newSex, newApp);
    setAdopting(false);
  };

  // Eligible opposite-sex partner if breeding is explicitly enabled
  const eligibleMate =
    rat && state.settings.breedingEnabled && rat.sex === 'female' && rat.lifeStage === 'adult' && rat.pregnancyDays === undefined
      ? state.rats.find((o) => o.sex === 'male' && o.lifeStage === 'adult' && (rat.relationships[o.id] ?? 0) >= 60)
      : undefined;

  return (
    <div className="panel-overlay" onClick={onClose}>
      <div className="panel-card" onClick={(e) => e.stopPropagation()}>
        <div className="panel-header">
          <h3 className="panel-title">
            <img src="./assets/sprites/pets.png" alt="Питомцы" />
            {adopting ? 'Центр знакомства с новым питомцем' : `Питомцы (${state.rats.length}/${MAX_RATS_LIMIT})`}
          </h3>
          <button type="button" className="btn-close" onClick={onClose}>×</button>
        </div>

        <div className="panel-body" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {adopting ? (
            <>
              <div style={{ display: 'flex', gap: 8 }}>
                <input
                  className="text-input"
                  maxLength={18}
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder="Имя новой крыски"
                />
                <button
                  type="button"
                  className="btn btn-soft btn-sm"
                  onClick={() => {
                    const pool = newSex === 'female' ? SUGGESTED_NAMES_FEMALE : SUGGESTED_NAMES_MALE;
                    setNewName(pool[Math.floor(Math.random() * pool.length)]);
                  }}
                >
                  Идея
                </button>
              </div>
              <RatAppearanceEditor
                appearance={newApp}
                sex={newSex}
                creativeMode={state.settings.creativeCoatMode}
                onChangeAppearance={setNewApp}
                onChangeSex={setNewSex}
              />
              {!state.settings.breedingEnabled && state.rats.some((r) => r.sex !== newSex) && (
                <div className="soft-card" style={{ background: '#F4F8F2', fontSize: 12 }}>
                  Режим разведения сейчас выключен — крыски будут просто дружить, играть и жить в мире.
                </div>
              )}
              <div style={{ display: 'flex', gap: 8 }}>
                <button type="button" className="btn btn-outline" onClick={() => setAdopting(false)}>
                  Отмена
                </button>
                <button
                  type="button"
                  disabled={state.coins < 50 || state.rats.length >= MAX_RATS_LIMIT}
                  className="btn btn-primary"
                  style={{ flex: 1 }}
                  onClick={handleAdoptConfirm}
                >
                  Приютить в семью (50 монет)
                </button>
              </div>
            </>
          ) : (
            <>
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center' }}>
                {state.rats.map((r) => (
                  <button
                    key={r.id}
                    type="button"
                    className={`tab-pill ${rat?.id === r.id ? 'active' : ''}`}
                    onClick={() => {
                      onSelectRat(r.id);
                      setEditingName(false);
                    }}
                  >
                    {r.name}
                  </button>
                ))}
                {state.rats.length < MAX_RATS_LIMIT && (
                  <button type="button" className="btn btn-soft btn-sm" onClick={() => setAdopting(true)}>
                    + Новая крыска
                  </button>
                )}
              </div>

              {rat && (
                <div className="soft-card" style={{ gap: 10 }}>
                  <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                    <img
                      src={`./assets/sprites/${getPresetSprite(rat.appearance)}.png`}
                      alt={rat.name}
                      style={{ width: 92, height: 68, objectFit: 'contain' }}
                    />
                    <div style={{ flex: 1 }}>
                      {editingName ? (
                        <div style={{ display: 'flex', gap: 6 }}>
                          <input
                            className="text-input"
                            style={{ padding: '6px 10px' }}
                            value={nameDraft}
                            maxLength={18}
                            onChange={(e) => setNameDraft(e.target.value)}
                          />
                          <button
                            type="button"
                            className="btn btn-primary btn-sm"
                            onClick={() => {
                              if (nameDraft.trim()) onRenameRat(rat.id, nameDraft.trim());
                              setEditingName(false);
                            }}
                          >
                            ОК
                          </button>
                        </div>
                      ) : (
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                          <strong style={{ fontSize: 18 }}>{rat.name}</strong>
                          <button
                            type="button"
                            className="btn btn-outline btn-sm"
                            onClick={() => {
                              setNameDraft(rat.name);
                              setEditingName(true);
                            }}
                          >
                            Переименовать
                          </button>
                          <button
                            type="button"
                            className="btn btn-soft btn-sm"
                            onClick={() => {
                              onFocusRat(rat.id);
                              onClose();
                            }}
                          >
                            Следить камерой
                          </button>
                        </div>
                      )}
                      <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4 }}>
                        {STAGE_RU[rat.lifeStage]} ({Math.floor(rat.ageDays)} дн.) · {rat.sex === 'female' ? 'Девочка' : 'Мальчик'} ·{' '}
                        <strong>{PERSONALITIES[rat.personality].name}</strong>
                      </div>
                      <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>
                        {describeAppearance(rat.appearance)}
                      </div>
                    </div>
                  </div>

                  <div style={{ fontSize: 12, background: '#F6F1E9', padding: '8px 10px', borderRadius: 12 }}>
                    <strong>Характер:</strong> {PERSONALITIES[rat.personality].description}
                    <div style={{ marginTop: 3, color: 'var(--sage-dark)' }}>Сейчас: {rat.statusText}</div>
                  </div>

                  {rat.needsVet && (
                    <div className="soft-card" style={{ background: '#FFF2EE', borderColor: '#E08B78' }}>
                      <div style={{ fontSize: 13, fontWeight: 700, color: '#9E3E2E' }}>
                        {rat.vetNote || 'Крыска немного приболела. Рекомендуем визит к игровому ветеринару.'}
                      </div>
                      <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                        Игровая ветеринарная помощь носит деликатный игровой характер и не заменяет консультацию специалиста в реальности.
                      </div>
                      <button type="button" className="btn btn-warm btn-sm" onClick={() => onVetVisit(rat.id)}>
                        Показать игровому ветеринару (20 монет)
                      </button>
                    </div>
                  )}

                  <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                    <StatBar label="Сытость" value={rat.satiety} />
                    <StatBar label="Свежая вода" value={rat.hydration} />
                    <StatBar label="Здоровье" value={rat.health} />
                    <StatBar label="Комфорт" value={rat.comfort} />
                    <StatBar label="Энергия" value={rat.energy} />
                    <StatBar label="Доверие" value={rat.trust} />
                  </div>

                  <div className="grid-2" style={{ gap: 8, fontSize: 12 }}>
                    <div className="soft-card" style={{ padding: 10 }}>
                      <strong>Любимая игрушка</strong>
                      <span>{FURNITURE_CATALOG[rat.favoriteToyType]?.name ?? 'Мягкий гамак'}</span>
                      <strong style={{ marginTop: 4 }}>Изученные трюки ({rat.learnedTricks.length})</strong>
                      <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                        {rat.learnedTricks.length === 0 ? (
                          <span style={{ color: 'var(--text-muted)' }}>Пока не изучены — загляните в «Игры»!</span>
                        ) : (
                          rat.learnedTricks.map((t) => (
                            <span key={t} className="chip">{TRICKS_CATALOG[t].name}</span>
                          ))
                        )}
                      </div>
                    </div>

                    <div className="soft-card" style={{ padding: 10 }}>
                      <strong>Отношения с друзьями</strong>
                      {state.rats
                        .filter((o) => o.id !== rat.id)
                        .map((o) => {
                          const bond = Math.round(rat.relationships[o.id] ?? 45);
                          return (
                            <div key={o.id} style={{ display: 'flex', justifyContent: 'space-between' }}>
                              <span>{o.name}</span>
                              <span style={{ fontWeight: 800, color: 'var(--sage-dark)' }}>
                                {bond}% {bond >= 75 ? '♥ Лучшие друзья' : '· Дружат'}
                              </span>
                            </div>
                          );
                        })}
                      {rat.parentNames && (
                        <div style={{ marginTop: 4, fontSize: 11, color: 'var(--text-muted)' }}>
                          Семья: родители {rat.parentNames[0]} и {rat.parentNames[1]} (упрощённая игровая модель наследования).
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Optional Breeding controls (ONLY shown if player enabled Breeding in Settings) */}
                  {state.settings.breedingEnabled && (
                    <div className="soft-card" style={{ background: '#F6F4FA', fontSize: 12 }}>
                      <strong>Семейный режим (Разведение включено)</strong>
                      <span style={{ color: 'var(--text-muted)' }}>
                        Лимит питомцев: {state.rats.length}/{MAX_RATS_LIMIT}. Наследование окраса использует упрощённую игровую модель.
                      </span>
                      {rat.pregnancyDays !== undefined && (
                        <div>{rat.name} уютно обустраивает гнездо — скоро появятся малыши!</div>
                      )}
                      {eligibleMate && state.rats.length < MAX_RATS_LIMIT && (
                        <button
                          type="button"
                          className="btn btn-soft btn-sm"
                          onClick={() => onStartPairing(rat.id, eligibleMate.id)}
                        >
                          Подготовить уютное гнездо с {eligibleMate.name}
                        </button>
                      )}
                      {rat.parentNames && rat.ageDays >= 35 && state.rats.length > 2 && (
                        <button
                          type="button"
                          className="btn btn-outline btn-sm"
                          onClick={() => onRehomeBaby(rat.id)}
                        >
                          Передать подросшего крысёнка в заботливую семью
                        </button>
                      )}
                    </div>
                  )}
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};

/* ================= 2. FEEDING PANEL ================= */
interface FeedPanelProps {
  state: GameState;
  onFeed: (food: FoodType) => void;
  onRefillWater: () => void;
  onClose: () => void;
}

export const FeedPanel: React.FC<FeedPanelProps> = ({ state, onFeed, onRefillWater, onClose }) => {
  const bowl = state.placedItems.find((i) => i.zone === 'cage' && i.itemId === 'food_bowl');
  const bottle = state.placedItems.find((i) => i.zone === 'cage' && i.itemId === 'water_bottle');

  return (
    <div className="panel-overlay" onClick={onClose}>
      <div className="panel-card" onClick={(e) => e.stopPropagation()}>
        <div className="panel-header">
          <h3 className="panel-title">
            <img src="./assets/sprites/pellet_food.png" alt="Корм" />
            Кормление и свежая вода
          </h3>
          <button type="button" className="btn-close" onClick={onClose}>×</button>
        </div>

        <div className="panel-body" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div className="soft-card" style={{ gap: 6, background: '#F4F8F2' }}>
            <StatBar label="Миска корма" value={bowl?.fillLevel ?? 0} />
            <StatBar label="Поилка воды" value={bottle?.fillLevel ?? 0} />
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 4 }}>
              <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                Основа питания — полнорационный корм. Лакомства хороши в меру.
              </span>
              <button type="button" className="btn btn-primary btn-sm" onClick={onRefillWater}>
                <img src="./assets/sprites/water_pitcher.png" alt="" style={{ width: 18, height: 18 }} />
                Обновить воду
              </button>
            </div>
          </div>

          <div className="grid-2">
            {(Object.keys(FOOD_CATALOG) as FoodType[]).map((fid) => {
              const def = FOOD_CATALOG[fid];
              const count = state.foodStock[fid] ?? 0;
              return (
                <div key={fid} className="soft-card">
                  <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                    <img src={`./assets/sprites/${def.sprite}.png`} alt={def.name} style={{ width: 52, height: 52, objectFit: 'contain' }} />
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 800 }}>{def.name}</div>
                      <span className="chip">В запасе: {count}</span>
                    </div>
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{def.description}</div>
                  <button
                    type="button"
                    disabled={count <= 0}
                    className={`btn btn-sm ${def.isStaple ? 'btn-primary' : 'btn-soft'}`}
                    onClick={() => onFeed(fid)}
                  >
                    {count > 0 ? (def.isStaple ? 'Насыпать в миску' : 'Угостить крысок') : 'Закончилось (купите в Магазине)'}
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};

/* ================= 3. INTERACTION PANEL ================= */
interface InteractPanelProps {
  state: GameState;
  selectedRatId: string | null;
  petMode: boolean;
  onTogglePetMode: () => void;
  onOfferHand: () => void;
  onCallRat: (ratId: string) => void;
  onGiveHandTreat: (ratId: string) => void;
  onSwitchZone: (zone: 'cage' | 'playpen') => void;
  onClose: () => void;
}

export const InteractPanel: React.FC<InteractPanelProps> = ({
  state,
  selectedRatId,
  petMode,
  onTogglePetMode,
  onOfferHand,
  onCallRat,
  onGiveHandTreat,
  onSwitchZone,
  onClose,
}) => {
  const rat = state.rats.find((r) => r.id === selectedRatId) || state.rats[0];
  if (!rat) return null;

  return (
    <div className="panel-overlay" onClick={onClose}>
      <div className="panel-card compact-bottom" style={{ maxHeight: '62vh' }} onClick={(e) => e.stopPropagation()}>
        <div className="panel-header">
          <h3 className="panel-title">
            <img src="./assets/sprites/trust.png" alt="Общение" />
            Общение с {rat.name} (Доверие {rat.trust}%)
          </h3>
          <button type="button" className="btn-close" onClick={onClose}>×</button>
        </div>

        <div className="panel-body" style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
            {PERSONALITIES[rat.personality].petReaction} Общение всегда мягкое и добровольное — никаких принуждений и стука по клетке.
          </div>

          <div className="grid-2">
            <button
              type="button"
              className="btn btn-primary"
              onClick={() => {
                onOfferHand();
                onClose();
              }}
            >
              Поднести ладонь и подождать
            </button>

            <button
              type="button"
              className={`btn ${petMode ? 'btn-warm' : 'btn-soft'}`}
              onClick={() => {
                onTogglePetMode();
                onClose();
              }}
            >
              {petMode ? 'Выключить режим поглаживания' : 'Мягко погладить пальцем'}
            </button>

            <button
              type="button"
              className="btn btn-soft"
              onClick={() => {
                onCallRat(rat.id);
                onClose();
              }}
            >
              Спокойно позвать по имени 🎵
            </button>

            <button
              type="button"
              disabled={(state.foodStock.fruit_treat + state.foodStock.game_treat) <= 0}
              className="btn btn-soft"
              onClick={() => {
                onGiveHandTreat(rat.id);
                onClose();
              }}
            >
              Предложить маленькое лакомство
            </button>

            <button
              type="button"
              disabled={!state.playpenUnlocked}
              className="btn btn-outline"
              onClick={() => {
                onSwitchZone(state.activeZone === 'cage' ? 'playpen' : 'cage');
                onClose();
              }}
            >
              {state.playpenUnlocked
                ? state.activeZone === 'cage'
                  ? 'Перенести в безопасный манеж'
                  : 'Вернуться в уютную клетку'
                : 'Манеж (откройте в Магазине)'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

/* ================= 4. SHOP PANEL ================= */
interface ShopPanelProps {
  state: GameState;
  onBuyFurniture: (id: FurnitureItemId) => void;
  onBuyFood: (id: FoodType) => void;
  onBuyTheme: (id: RoomThemeId) => void;
  onSelectTheme: (id: RoomThemeId) => void;
  onUpgradeCage3: () => void;
  onUnlockPlaypen: () => void;
  onOpenAdopt: () => void;
  onClose: () => void;
}

export const ShopPanel: React.FC<ShopPanelProps> = ({
  state,
  onBuyFurniture,
  onBuyFood,
  onBuyTheme,
  onSelectTheme,
  onUpgradeCage3,
  onUnlockPlaypen,
  onOpenAdopt,
  onClose,
}) => {
  const [tab, setTab] = useState<'furniture' | 'food' | 'habitats' | 'themes'>('furniture');

  return (
    <div className="panel-overlay" onClick={onClose}>
      <div className="panel-card" onClick={(e) => e.stopPropagation()}>
        <div className="panel-header">
          <h3 className="panel-title">
            <img src="./assets/sprites/shop.png" alt="Магазин" />
            Зоомагазин · {state.coins} монет
          </h3>
          <button type="button" className="btn-close" onClick={onClose}>×</button>
        </div>

        <div className="panel-body" style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <div className="tabs-row" style={{ marginBottom: 0 }}>
            <button type="button" className={`tab-pill ${tab === 'furniture' ? 'active' : ''}`} onClick={() => setTab('furniture')}>
              Домики, гамаки и игрушки
            </button>
            <button type="button" className={`tab-pill ${tab === 'food' ? 'active' : ''}`} onClick={() => setTab('food')}>
              Корма и лакомства
            </button>
            <button type="button" className={`tab-pill ${tab === 'habitats' ? 'active' : ''}`} onClick={() => setTab('habitats')}>
              Клетка и манеж
            </button>
            <button type="button" className={`tab-pill ${tab === 'themes' ? 'active' : ''}`} onClick={() => setTab('themes')}>
              Темы комнаты
            </button>
            <button type="button" className="tab-pill" onClick={onOpenAdopt}>
              Центр знакомства
            </button>
          </div>

          {tab === 'furniture' && (
            <div className="grid-2">
              {(Object.values(FURNITURE_CATALOG)).map((item) => (
                <div key={item.id} className="soft-card">
                  <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                    <img src={`./assets/sprites/${item.sprite}.png`} alt={item.name} style={{ width: 54, height: 50, objectFit: 'contain' }} />
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 800 }}>{item.name}</div>
                      <span className="chip">Уют +{item.comfortBonus}</span>
                    </div>
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{item.description}</div>
                  <button
                    type="button"
                    disabled={state.coins < item.price}
                    className="btn btn-primary btn-sm"
                    onClick={() => onBuyFurniture(item.id)}
                  >
                    Купить за {item.price} монет
                  </button>
                </div>
              ))}
            </div>
          )}

          {tab === 'food' && (
            <div className="grid-2">
              {Object.values(FOOD_CATALOG).map((f) => (
                <div key={f.id} className="soft-card">
                  <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                    <img src={`./assets/sprites/${f.sprite}.png`} alt={f.name} style={{ width: 52, height: 52, objectFit: 'contain' }} />
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 800 }}>{f.name}</div>
                      <span className="chip">×{f.packAmount} порций · дома: {state.foodStock[f.id] ?? 0}</span>
                    </div>
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{f.description}</div>
                  <button
                    type="button"
                    disabled={state.coins < f.price}
                    className="btn btn-primary btn-sm"
                    onClick={() => onBuyFood(f.id)}
                  >
                    Купить за {f.price} монет
                  </button>
                </div>
              ))}
            </div>
          )}

          {tab === 'habitats' && (
            <div className="grid-2">
              <div className={`soft-card ${state.habitatLevel >= 3 ? 'highlight' : ''}`}>
                <img src="./assets/sprites/three_level_cage.png" alt="3-ярусная клетка" style={{ width: '100%', height: 135, objectFit: 'contain' }} />
                <strong>Просторная 3-ярусная клетка</strong>
                <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                  Дополнительный широкий верхний этаж со сплошной берёзовой полкой и безопасной лесенкой.
                </div>
                <button
                  type="button"
                  disabled={state.habitatLevel >= 3 || state.coins < 160}
                  className="btn btn-primary btn-sm"
                  onClick={onUpgradeCage3}
                >
                  {state.habitatLevel >= 3 ? 'Уже установлена ✓' : 'Улучшить за 160 монет'}
                </button>
              </div>

              <div className={`soft-card ${state.playpenUnlocked ? 'highlight' : ''}`}>
                <img src="./assets/sprites/playpen.png" alt="Защищённый манеж" style={{ width: '100%', height: 135, objectFit: 'contain' }} />
                <strong>Защищённый игровой манеж</strong>
                <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                  Просторный безопасный выгул без проводов, щелей и опасных растений — с туннелями и мягким ковриком.
                </div>
                <button
                  type="button"
                  disabled={state.playpenUnlocked || state.coins < 110}
                  className="btn btn-primary btn-sm"
                  onClick={onUnlockPlaypen}
                >
                  {state.playpenUnlocked ? 'Открыт ✓' : 'Открыть за 110 монет'}
                </button>
              </div>
            </div>
          )}

          {tab === 'themes' && (
            <div className="grid-2">
              {Object.values(ROOM_THEMES).map((th) => {
                const owned = state.unlockedThemes.includes(th.id);
                const active = state.theme === th.id;
                return (
                  <div key={th.id} className={`soft-card ${active ? 'highlight' : ''}`}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span style={{ width: 26, height: 26, borderRadius: 8, background: th.wallColor, border: `3px solid ${th.accentColor}` }} />
                      <strong style={{ fontSize: 14 }}>{th.name}</strong>
                    </div>
                    <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{th.description}</div>
                    {owned ? (
                      <button
                        type="button"
                        disabled={active}
                        className="btn btn-soft btn-sm"
                        onClick={() => onSelectTheme(th.id)}
                      >
                        {active ? 'Выбрана ✓' : 'Применить оформление'}
                      </button>
                    ) : (
                      <button
                        type="button"
                        disabled={state.coins < th.price}
                        className="btn btn-primary btn-sm"
                        onClick={() => onBuyTheme(th.id)}
                      >
                        Открыть за {th.price} монет
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

/* ================= 5. QUESTS, ACHIEVEMENTS & COAT GALLERY ================= */
interface QuestsPanelProps {
  state: GameState;
  onClaimQuest: (questId: string) => void;
  onClose: () => void;
}

export const QuestsPanel: React.FC<QuestsPanelProps> = ({ state, onClaimQuest, onClose }) => {
  const [tab, setTab] = useState<'quests' | 'achievements' | 'collection'>('quests');

  return (
    <div className="panel-overlay" onClick={onClose}>
      <div className="panel-card" onClick={(e) => e.stopPropagation()}>
        <div className="panel-header">
          <h3 className="panel-title">
            <img src="./assets/sprites/quests.png" alt="Задания" />
            Задания и достижения
          </h3>
          <button type="button" className="btn-close" onClick={onClose}>×</button>
        </div>

        <div className="panel-body" style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <div className="tabs-row" style={{ marginBottom: 0 }}>
            <button type="button" className={`tab-pill ${tab === 'quests' ? 'active' : ''}`} onClick={() => setTab('quests')}>
              Задания
            </button>
            <button type="button" className={`tab-pill ${tab === 'achievements' ? 'active' : ''}`} onClick={() => setTab('achievements')}>
              Достижения ({state.achievements.length}/{ACHIEVEMENTS_CATALOG.length})
            </button>
            <button type="button" className={`tab-pill ${tab === 'collection' ? 'active' : ''}`} onClick={() => setTab('collection')}>
              Окрасы ({state.discoveredPresets.length}/{COAT_PRESETS.length})
            </button>
          </div>

          {tab === 'quests' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {QUESTS_CATALOG.map((q) => {
                const prog = state.quests[q.id] ?? { progress: 0, completed: false, claimed: false };
                return (
                  <div key={q.id} className={`soft-card ${prog.completed && !prog.claimed ? 'highlight' : ''}`} style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 800, fontSize: 14 }}>{q.title}</div>
                      <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{q.description}</div>
                      <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--sage-dark)', marginTop: 3 }}>
                        Прогресс: {prog.progress}/{q.target} · Награда: +{q.rewardCoins} монет
                      </div>
                    </div>
                    {prog.claimed ? (
                      <span className="chip">Получено ✓</span>
                    ) : prog.completed ? (
                      <button type="button" className="btn btn-primary btn-sm" onClick={() => onClaimQuest(q.id)}>
                        Забрать +{q.rewardCoins}
                      </button>
                    ) : (
                      <span className="chip" style={{ background: '#F0EAE0', color: 'var(--text-muted)' }}>В процессе</span>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {tab === 'achievements' && (
            <div className="grid-2">
              {ACHIEVEMENTS_CATALOG.map((a) => {
                const unlocked = state.achievements.includes(a.id);
                return (
                  <div key={a.id} className={`soft-card ${unlocked ? 'highlight' : ''}`} style={{ opacity: unlocked ? 1 : 0.6 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <img src={`./assets/sprites/${a.icon}.png`} alt={a.title} style={{ width: 38, height: 38, objectFit: 'contain' }} />
                      <div>
                        <strong style={{ fontSize: 13 }}>{a.title}</strong>
                        <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{a.description}</div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {tab === 'collection' && (
            <>
              <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                Добровольный дневник окрасов: собирать все варианты необязательно для прохождения игры.
              </div>
              <div className="grid-3">
                {COAT_PRESETS.map((p) => {
                  const found = state.discoveredPresets.includes(p.id);
                  return (
                    <div key={p.id} className={`soft-card ${found ? 'highlight' : ''}`} style={{ alignItems: 'center', textAlign: 'center', opacity: found ? 1 : 0.55 }}>
                      <img src={`./assets/sprites/${p.sprite}.png`} alt={p.name} style={{ width: 68, height: 48, objectFit: 'contain' }} />
                      <div style={{ fontSize: 11, fontWeight: 700 }}>{p.name}</div>
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

/* ================= 6. PHOTO & MEMORY ALBUM ================= */
interface AlbumPanelProps {
  state: GameState;
  onEnterPhotoMode: () => void;
  onDeletePhoto: (id: string) => void;
  onClose: () => void;
}

export const AlbumPanel: React.FC<AlbumPanelProps> = ({
  state,
  onEnterPhotoMode,
  onDeletePhoto,
  onClose,
}) => {
  const [tab, setTab] = useState<'photos' | 'memories'>('photos');

  return (
    <div className="panel-overlay" onClick={onClose}>
      <div className="panel-card" onClick={(e) => e.stopPropagation()}>
        <div className="panel-header">
          <h3 className="panel-title">
            <img src="./assets/sprites/camera.png" alt="Фото" />
            Фоторежим и альбом воспоминаний
          </h3>
          <button type="button" className="btn-close" onClick={onClose}>×</button>
        </div>

        <div className="panel-body" style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
            <div style={{ display: 'flex', gap: 6 }}>
              <button type="button" className={`tab-pill ${tab === 'photos' ? 'active' : ''}`} onClick={() => setTab('photos')}>
                Снимки ({state.photos.length})
              </button>
              <button type="button" className={`tab-pill ${tab === 'memories' ? 'active' : ''}`} onClick={() => setTab('memories')}>
                Память ({state.memories.length})
              </button>
            </div>
            <button type="button" className="btn btn-primary btn-sm" onClick={onEnterPhotoMode}>
              Открыть фоторежим без интерфейса 📸
            </button>
          </div>

          {tab === 'photos' ? (
            state.photos.length === 0 ? (
              <div className="soft-card" style={{ textAlign: 'center', padding: 24, color: 'var(--text-muted)' }}>
                Пока нет фотографий. Включите фоторежим, выберите красивый ракурс и сохраните момент!
              </div>
            ) : (
              <div className="grid-2">
                {state.photos.map((ph) => (
                  <div key={ph.id} className="soft-card" style={{ padding: 8 }}>
                    <img src={ph.dataUrl} alt={ph.caption} style={{ width: '100%', borderRadius: 12, aspectRatio: '16/10', objectFit: 'cover' }} />
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontSize: 12, fontWeight: 700 }}>{ph.caption}</span>
                      <button type="button" className="btn btn-outline btn-sm" onClick={() => onDeletePhoto(ph.id)}>
                        Удалить
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div
                className="soft-card highlight"
                style={{ alignItems: 'center', textAlign: 'center', padding: 14, background: '#FAF4EA' }}
              >
                <img
                  src="./assets/dedication_plaque.png"
                  alt="Посвящается: Тимме, Жоржу, Васе, Элвину"
                  style={{ width: '100%', maxWidth: 360, borderRadius: 12 }}
                />
                <div style={{ fontSize: 13, fontWeight: 800, color: '#6E4C36' }}>
                  Светлая память любимым домашним крыскам ♥
                </div>
              </div>

              {state.memories.length === 0 ? (
                <div className="soft-card" style={{ textAlign: 'center', padding: 18, color: 'var(--text-muted)', fontSize: 12 }}>
                  Здесь также бережно хранятся памятные карточки ваших игровых питомцев, если включена опция естественного жизненного цикла.
                </div>
              ) : (
                <div className="grid-2">
                  {state.memories.map((m) => (
                    <div key={m.id} className="soft-card highlight">
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <img src={`./assets/sprites/${getPresetSprite(m.appearance)}.png`} alt={m.ratName} style={{ width: 64, height: 48, objectFit: 'contain' }} />
                        <div>
                          <strong>{m.ratName}</strong>
                          <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{m.ageDays} дн. · {PERSONALITIES[m.personality].name}</div>
                        </div>
                      </div>
                      <div style={{ fontSize: 12 }}>{m.note}</div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

/* ================= 7. SETTINGS PANEL ================= */
interface SettingsPanelProps {
  settings: GameSettings;
  onUpdateSettings: (patch: Partial<GameSettings>) => void;
  onExportBackup: () => void;
  onImportBackup: (json: string) => void;
  onResetGame: () => void;
  onClose: () => void;
}

export const SettingsPanel: React.FC<SettingsPanelProps> = ({
  settings,
  onUpdateSettings,
  onExportBackup,
  onImportBackup,
  onResetGame,
  onClose,
}) => {
  const [importText, setImportText] = useState('');
  const [showImport, setShowImport] = useState(false);

  const Toggle: React.FC<{ title: string; subtitle: string; value: boolean; onToggle: () => void }> = ({
    title,
    subtitle,
    value,
    onToggle,
  }) => (
    <div className="toggle-row">
      <div>
        <div style={{ fontWeight: 800, fontSize: 14 }}>{title}</div>
        <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{subtitle}</div>
      </div>
      <button type="button" className={`switch ${value ? 'on' : ''}`} onClick={onToggle} aria-label={title} />
    </div>
  );

  return (
    <div className="panel-overlay" onClick={onClose}>
      <div className="panel-card" onClick={(e) => e.stopPropagation()}>
        <div className="panel-header">
          <h3 className="panel-title">
            <img src="./assets/sprites/settings.png" alt="Настройки" />
            Настройки и режимы игры
          </h3>
          <button type="button" className="btn-close" onClick={onClose}>×</button>
        </div>

        <div className="panel-body" style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <div className="soft-card">
            <strong style={{ fontSize: 14 }}>Режимы жизни и заботы</strong>
            <Toggle
              title="Комфортный режим"
              subtitle="Питомцы не умирают, нет необратимых болезней, голод и уборка остаются в спокойных пределах."
              value={settings.comfortMode}
              onToggle={() => onUpdateSettings({ comfortMode: !settings.comfortMode })}
            />
            <Toggle
              title="Разведение (по умолчанию выключено)"
              subtitle="Позволяет осознанно завести потомство с лимитом питомцев и упрощённой игровой генетикой."
              value={settings.breedingEnabled}
              onToggle={() => onUpdateSettings({ breedingEnabled: !settings.breedingEnabled })}
            />
            <Toggle
              title="Старение (стадии жизни)"
              subtitle="Крысёныш → подросток → взрослая крыска → пожилая крыска."
              value={settings.agingEnabled}
              onToggle={() => onUpdateSettings({ agingEnabled: !settings.agingEnabled })}
            />
            <Toggle
              title="Естественная смерть в глубокой старости"
              subtitle="Работает только при выключенном Комфортном режиме. Без пугающих сцен, с альбомом памяти."
              value={settings.naturalDeathEnabled}
              onToggle={() => onUpdateSettings({ naturalDeathEnabled: !settings.naturalDeathEnabled })}
            />
            <Toggle
              title="Творческий режим окрасов"
              subtitle="Свободно сочетать любые цвета глаз, полосы и рисунки шерсти в редакторе."
              value={settings.creativeCoatMode}
              onToggle={() => onUpdateSettings({ creativeCoatMode: !settings.creativeCoatMode })}
            />
          </div>

          <div className="soft-card">
            <strong style={{ fontSize: 14 }}>Звук, графика и удобство</strong>
            <label style={{ fontSize: 13, fontWeight: 700 }}>
              Громкость музыки: {Math.round(settings.musicVolume * 100)}%
              <input
                type="range"
                min={0}
                max={1}
                step={0.05}
                value={settings.musicVolume}
                onChange={(e) => onUpdateSettings({ musicVolume: parseFloat(e.target.value) })}
                style={{ width: '100%' }}
              />
            </label>
            <label style={{ fontSize: 13, fontWeight: 700 }}>
              Громкость звуков: {Math.round(settings.sfxVolume * 100)}%
              <input
                type="range"
                min={0}
                max={1}
                step={0.05}
                value={settings.sfxVolume}
                onChange={(e) => onUpdateSettings({ sfxVolume: parseFloat(e.target.value) })}
                style={{ width: '100%' }}
              />
            </label>
            <Toggle
              title="Вибрация (тактильный отклик)"
              subtitle="Лёгкий отклик на Android при поглаживании и нажатиях."
              value={settings.vibration}
              onToggle={() => onUpdateSettings({ vibration: !settings.vibration })}
            />
            <Toggle
              title="Уменьшенная анимация интерфейса"
              subtitle="Убирает плавные переходы кнопок и панелей для максимального комфорта."
              value={settings.reducedMotion}
              onToggle={() => onUpdateSettings({ reducedMotion: !settings.reducedMotion })}
            />

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8, marginTop: 6 }}>
              <span style={{ fontSize: 13, fontWeight: 700 }}>Качество 3D-графики:</span>
              <div style={{ display: 'flex', gap: 6 }}>
                {(['low', 'medium', 'high'] as const).map((q) => (
                  <button
                    key={q}
                    type="button"
                    className={`tab-pill ${settings.graphicsQuality === q ? 'active' : ''}`}
                    onClick={() => onUpdateSettings({ graphicsQuality: q })}
                  >
                    {q === 'low' ? 'Низкое' : q === 'medium' ? 'Среднее' : 'Высокое'}
                  </button>
                ))}
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
              <span style={{ fontSize: 13, fontWeight: 700 }}>Частота кадров:</span>
              <div style={{ display: 'flex', gap: 6 }}>
                {([30, 60] as const).map((fps) => (
                  <button
                    key={fps}
                    type="button"
                    className={`tab-pill ${settings.fpsLimit === fps ? 'active' : ''}`}
                    onClick={() => onUpdateSettings({ fpsLimit: fps })}
                  >
                    {fps} FPS {fps === 30 ? '(экономно)' : '(плавно)'}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="soft-card" style={{ gap: 8 }}>
            <strong style={{ fontSize: 14 }}>Сохранения и резервная копия</strong>
            <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>
              Игра автоматически сохраняется локально (офлайн) с резервной копией.
            </div>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              <button type="button" className="btn btn-soft btn-sm" onClick={onExportBackup}>
                Скачать резервную копию (JSON)
              </button>
              <button type="button" className="btn btn-outline btn-sm" onClick={() => setShowImport((v) => !v)}>
                Восстановить из JSON
              </button>
              <button type="button" className="btn btn-warm btn-sm" onClick={onResetGame}>
                Сбросить игру
              </button>
            </div>
            {showImport && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                <textarea
                  rows={4}
                  className="text-input"
                  value={importText}
                  onChange={(e) => setImportText(e.target.value)}
                  placeholder="Вставьте содержимое файла резервной копии..."
                />
                <button
                  type="button"
                  className="btn btn-primary btn-sm"
                  onClick={() => {
                    onImportBackup(importText);
                    setShowImport(false);
                    setImportText('');
                  }}
                >
                  Импортировать сохранение
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
