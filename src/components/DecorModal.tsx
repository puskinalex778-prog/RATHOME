import React, { useEffect, useState } from 'react';
import { COLOR_PALETTE, FURNITURE_CATALOG } from '../data/catalog';
import { DecorPreviewSpec } from '../scene/CageScene';
import { validatePlacement } from '../simulation/gameLogic';
import { ActiveZone, FurnitureItemId, PlacedItem } from '../types/game';

interface DecorModalProps {
  activeZone: ActiveZone;
  habitatLevel: 2 | 3;
  placedItems: PlacedItem[];
  inventory: Partial<Record<FurnitureItemId, number>>;
  onPlaceNew: (item: Omit<PlacedItem, 'uid'>) => void;
  onUpdatePlaced: (uid: string, patch: Partial<PlacedItem>) => void;
  onStowToInventory: (uid: string) => void;
  onPreviewChange: (preview: DecorPreviewSpec | null) => void;
  onClose: () => void;
}

export const DecorModal: React.FC<DecorModalProps> = ({
  activeZone,
  habitatLevel,
  placedItems,
  inventory,
  onPlaceNew,
  onUpdatePlaced,
  onStowToInventory,
  onPreviewChange,
  onClose,
}) => {
  const [mode, setMode] = useState<'inventory' | 'placed'>('inventory');
  const [draftItemId, setDraftItemId] = useState<FurnitureItemId | null>(null);
  const [editingUid, setEditingUid] = useState<string | null>(null);

  const [level, setLevel] = useState<number>(0);
  const [x, setX] = useState<number>(0);
  const [z, setZ] = useState<number>(0.1);
  const [rotation, setRotation] = useState<number>(0);
  const [colorHex, setColorHex] = useState<string>('#6F8672');

  const zonePlaced = placedItems.filter((i) => i.zone === activeZone);
  const invEntries = (Object.entries(inventory) as [FurnitureItemId, number][]).filter(
    ([id, count]) => count > 0 && FURNITURE_CATALOG[id]?.allowedZones.includes(activeZone)
  );

  const activeItemId: FurnitureItemId | null =
    draftItemId ?? (editingUid ? placedItems.find((p) => p.uid === editingUid)?.itemId ?? null : null);

  const validation = activeItemId
    ? validatePlacement(
        {
          itemId: activeItemId,
          zone: activeZone,
          level: activeZone === 'playpen' ? 0 : level,
          x,
          z,
          rotation,
          colorHex,
        },
        placedItems,
        habitatLevel,
        editingUid ?? undefined
      )
    : { valid: true };

  // Sync live 3D green/red ghost preview!
  useEffect(() => {
    if (!activeItemId) {
      onPreviewChange(null);
      return;
    }
    onPreviewChange({
      itemId: activeItemId,
      zone: activeZone,
      level: activeZone === 'playpen' ? 0 : level,
      x,
      z,
      rotation,
      colorHex,
      valid: validation.valid,
    });
  }, [activeItemId, activeZone, level, x, z, rotation, colorHex, validation.valid, onPreviewChange]);

  useEffect(() => {
    return () => onPreviewChange(null);
  }, [onPreviewChange]);

  const startPlaceFromInv = (id: FurnitureItemId) => {
    const def = FURNITURE_CATALOG[id];
    setEditingUid(null);
    setDraftItemId(id);
    setLevel(id === 'hammock' ? 1 : 0);
    setX(id === 'water_bottle' ? 1.24 : -0.15);
    setZ(0.12);
    setRotation(0);
    setColorHex(def.defaultColor);
  };

  const startEditPlaced = (item: PlacedItem) => {
    setDraftItemId(null);
    setEditingUid(item.uid);
    setLevel(item.level);
    setX(item.x);
    setZ(item.z);
    setRotation(item.rotation);
    setColorHex(item.colorHex);
  };

  const confirmPlacement = () => {
    if (!activeItemId || !validation.valid) return;
    if (draftItemId) {
      onPlaceNew({
        itemId: draftItemId,
        zone: activeZone,
        level: activeZone === 'playpen' ? 0 : level,
        x,
        z,
        rotation,
        colorHex,
        fillLevel: draftItemId === 'food_bowl' || draftItemId === 'water_bottle' ? 50 : undefined,
      });
      setDraftItemId(null);
    } else if (editingUid) {
      onUpdatePlaced(editingUid, {
        level: activeZone === 'playpen' ? 0 : level,
        x,
        z,
        rotation,
        colorHex,
      });
      setEditingUid(null);
    }
  };

  const def = activeItemId ? FURNITURE_CATALOG[activeItemId] : null;
  const maxX = activeZone === 'playpen' ? 1.3 : 1.02;
  const maxZ = activeZone === 'playpen' ? 1.3 : 0.48;

  return (
    <div
      className="panel-overlay"
      style={{ background: 'transparent', alignItems: 'flex-end', pointerEvents: 'none' }}
    >
      <div
        className="panel-card compact-bottom"
        style={{ pointerEvents: 'auto', maxHeight: '48vh' }}
      >
        <div className="panel-header" style={{ padding: '10px 14px' }}>
          <h3 className="panel-title" style={{ fontSize: 15 }}>
            <img src="./assets/sprites/wood_house.png" alt="Обустройство" />
            Обустройство ({activeZone === 'cage' ? 'Клетка' : 'Манеж'})
          </h3>
          <button type="button" className="btn-close" onClick={onClose}>×</button>
        </div>

        <div className="panel-body" style={{ padding: '10px 14px', display: 'flex', flexDirection: 'column', gap: 10 }}>
          {activeItemId && def ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <strong>{def.name}</strong>
                <span
                  className="chip"
                  style={{
                    background: validation.valid ? '#E1F5E5' : '#FDE5E2',
                    color: validation.valid ? '#2B6E3B' : '#A63A32',
                  }}
                >
                  {validation.valid ? 'Безопасное место ✓' : validation.reason}
                </span>
              </div>

              {/* Position sliders + shelf level + rotate */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                <label style={{ fontSize: 12, fontWeight: 700 }}>
                  Влево / Вправо ({x.toFixed(2)})
                  <input
                    type="range"
                    min={def.id === 'water_bottle' ? 1.2 : -maxX}
                    max={def.id === 'water_bottle' ? 1.24 : maxX}
                    step={0.05}
                    value={x}
                    onChange={(e) => setX(parseFloat(e.target.value))}
                    style={{ width: '100%' }}
                  />
                </label>
                <label style={{ fontSize: 12, fontWeight: 700 }}>
                  Ближе / Дальше ({z.toFixed(2)})
                  <input
                    type="range"
                    min={-maxZ}
                    max={maxZ}
                    step={0.05}
                    value={z}
                    onChange={(e) => setZ(parseFloat(e.target.value))}
                    style={{ width: '100%' }}
                  />
                </label>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                {activeZone === 'cage' && (
                  <>
                    <span style={{ fontSize: 12, fontWeight: 700 }}>Ярус:</span>
                    {[0, 1, ...(habitatLevel === 3 ? [2] : [])].map((lvl) => (
                      <button
                        key={lvl}
                        type="button"
                        className={`tab-pill ${level === lvl ? 'active' : ''}`}
                        onClick={() => setLevel(lvl)}
                      >
                        {lvl === 0 ? 'Низ' : `Полка ${lvl}`}
                      </button>
                    ))}
                  </>
                )}
                <button
                  type="button"
                  className="btn btn-soft btn-sm"
                  onClick={() => setRotation((r) => (r + Math.PI / 4) % (Math.PI * 2))}
                >
                  Повернуть 45°
                </button>
              </div>

              {def.colorable && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                  <span style={{ fontSize: 12, fontWeight: 700 }}>Цвет:</span>
                  {COLOR_PALETTE.map((c) => (
                    <button
                      key={c.hex}
                      type="button"
                      title={c.name}
                      className={`swatch ${colorHex === c.hex ? 'active' : ''}`}
                      style={{ background: c.hex }}
                      onClick={() => setColorHex(c.hex)}
                    />
                  ))}
                </div>
              )}

              <div style={{ display: 'flex', gap: 8 }}>
                <button
                  type="button"
                  disabled={!validation.valid}
                  className="btn btn-primary btn-sm"
                  style={{ flex: 1 }}
                  onClick={confirmPlacement}
                >
                  {draftItemId ? 'Поставить здесь' : 'Сохранить положение'}
                </button>
                {editingUid && activeItemId !== 'food_bowl' && activeItemId !== 'water_bottle' && (
                  <button
                    type="button"
                    className="btn btn-warm btn-sm"
                    onClick={() => {
                      onStowToInventory(editingUid);
                      setEditingUid(null);
                    }}
                  >
                    В инвентарь
                  </button>
                )}
                <button
                  type="button"
                  className="btn btn-outline btn-sm"
                  onClick={() => {
                    setDraftItemId(null);
                    setEditingUid(null);
                  }}
                >
                  Назад
                </button>
              </div>
            </div>
          ) : (
            <>
              <div className="tabs-row" style={{ marginBottom: 0 }}>
                <button
                  type="button"
                  className={`tab-pill ${mode === 'inventory' ? 'active' : ''}`}
                  onClick={() => setMode('inventory')}
                >
                  Из инвентаря ({invEntries.length})
                </button>
                <button
                  type="button"
                  className={`tab-pill ${mode === 'placed' ? 'active' : ''}`}
                  onClick={() => setMode('placed')}
                >
                  Расставленные ({zonePlaced.length})
                </button>
              </div>

              {mode === 'inventory' ? (
                invEntries.length === 0 ? (
                  <div style={{ fontSize: 13, color: 'var(--text-muted)', padding: 12 }}>
                    В инвентаре пока пусто — купите уютные гамаки, домики и игрушки в Магазине!
                  </div>
                ) : (
                  <div style={{ display: 'flex', gap: 8, overflowX: 'auto', paddingBottom: 4 }}>
                    {invEntries.map(([id, count]) => {
                      const d = FURNITURE_CATALOG[id];
                      return (
                        <button
                          key={id}
                          type="button"
                          className="soft-card"
                          style={{ flex: '0 0 120px', alignItems: 'center', cursor: 'pointer', padding: 8 }}
                          onClick={() => startPlaceFromInv(id)}
                        >
                          <img src={`./assets/sprites/${d.sprite}.png`} alt={d.name} style={{ width: 48, height: 44, objectFit: 'contain' }} />
                          <div style={{ fontSize: 11, fontWeight: 800, textAlign: 'center' }}>{d.name}</div>
                          <span className="chip">×{count}</span>
                        </button>
                      );
                    })}
                  </div>
                )
              ) : (
                <div style={{ display: 'flex', gap: 8, overflowX: 'auto', paddingBottom: 4 }}>
                  {zonePlaced.map((it) => {
                    const d = FURNITURE_CATALOG[it.itemId];
                    return (
                      <button
                        key={it.uid}
                        type="button"
                        className="soft-card"
                        style={{ flex: '0 0 126px', alignItems: 'center', cursor: 'pointer', padding: 8 }}
                        onClick={() => startEditPlaced(it)}
                      >
                        <img src={`./assets/sprites/${d.sprite}.png`} alt={d.name} style={{ width: 46, height: 42, objectFit: 'contain' }} />
                        <div style={{ fontSize: 11, fontWeight: 800, textAlign: 'center' }}>{d.name}</div>
                        <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>
                          {activeZone === 'playpen' ? 'Манеж' : it.level === 0 ? 'Низ' : `Полка ${it.level}`}
                        </span>
                      </button>
                    );
                  })}
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};
