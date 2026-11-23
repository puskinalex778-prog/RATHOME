import React, { useState } from 'react';
import {
  BASE_COLORS,
  COAT_PRESETS,
  EYE_COLOR_INFO,
  PATTERN_NAMES,
  getAllowedEyeColors,
} from '../data/coats';
import {
  BaseColorId,
  CoatTexture,
  EarType,
  EyeColorId,
  LifeStage,
  PatternId,
  RatAppearance,
  RatSex,
} from '../types/game';
import { RatPreview3D } from './RatPreview3D';

interface RatAppearanceEditorProps {
  appearance: RatAppearance;
  sex: RatSex;
  creativeMode: boolean;
  onChangeAppearance: (app: RatAppearance) => void;
  onChangeSex?: (sex: RatSex) => void;
  lockSex?: boolean;
  title?: string;
}

export const RatAppearanceEditor: React.FC<RatAppearanceEditorProps> = ({
  appearance,
  sex,
  creativeMode,
  onChangeAppearance,
  onChangeSex,
  lockSex = false,
  title,
}) => {
  const [tab, setTab] = useState<'presets' | 'custom'>('presets');
  const [previewStage, setPreviewStage] = useState<LifeStage>('baby');

  const allowedEyes = getAllowedEyeColors(appearance, creativeMode);

  const selectPreset = (presetId: string) => {
    const p = COAT_PRESETS.find((c) => c.id === presetId);
    if (!p) return;
    onChangeAppearance({
      ...p.appearance,
      ears: appearance.ears,
      coatTexture: appearance.coatTexture,
    });
  };

  const updateCustom = (patch: Partial<RatAppearance>) => {
    const next: RatAppearance = {
      ...appearance,
      ...patch,
      presetId: 'custom',
    };
    const nextAllowedEyes = getAllowedEyeColors(next, creativeMode);
    if (!nextAllowedEyes.includes(next.eyeColor)) {
      next.eyeColor = nextAllowedEyes[0];
    }
    onChangeAppearance(next);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      {title && <div style={{ fontWeight: 800, fontSize: 15 }}>{title}</div>}

      {/* Live 3D Turntable with Baby / Adult Preview toggle */}
      <div style={{ position: 'relative' }}>
        <RatPreview3D appearance={appearance} lifeStage={previewStage} height={175} />
        <div
          style={{
            position: 'absolute',
            top: 8,
            right: 8,
            display: 'flex',
            gap: 4,
            background: 'rgba(255,255,255,0.88)',
            padding: 3,
            borderRadius: 999,
          }}
        >
          <button
            type="button"
            className={`tab-pill ${previewStage === 'baby' ? 'active' : ''}`}
            style={{ padding: '4px 10px', fontSize: 11 }}
            onClick={() => setPreviewStage('baby')}
          >
            Крысёныш
          </button>
          <button
            type="button"
            className={`tab-pill ${previewStage === 'adult' ? 'active' : ''}`}
            style={{ padding: '4px 10px', fontSize: 11 }}
            onClick={() => setPreviewStage('adult')}
          >
            Взрослый вид
          </button>
        </div>
      </div>

      <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>
        Все варианты — декоративные крысы одного вида с разными признаками внешности. Никаких случайных попыток: вы сразу видите питомца.
      </div>

      {/* Mode tabs: 20 Ready Presets vs Mix Color + Pattern */}
      <div className="tabs-row" style={{ marginBottom: 2 }}>
        <button
          type="button"
          className={`tab-pill ${tab === 'presets' ? 'active' : ''}`}
          onClick={() => setTab('presets')}
        >
          Готовые окрасы ({COAT_PRESETS.length})
        </button>
        <button
          type="button"
          className={`tab-pill ${tab === 'custom' ? 'active' : ''}`}
          onClick={() => setTab('custom')}
        >
          Своё сочетание {creativeMode ? '(Творческий)' : ''}
        </button>
      </div>

      {tab === 'presets' ? (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(126px, 1fr))',
            gap: 8,
            maxHeight: 220,
            overflowY: 'auto',
            paddingRight: 2,
          }}
        >
          {COAT_PRESETS.map((p) => {
            const active = appearance.presetId === p.id;
            return (
              <button
                key={p.id}
                type="button"
                onClick={() => selectPreset(p.id)}
                className={`soft-card ${active ? 'highlight' : ''}`}
                style={{
                  padding: 8,
                  alignItems: 'center',
                  textAlign: 'center',
                  cursor: 'pointer',
                  gap: 4,
                }}
              >
                <img
                  src={`./assets/sprites/${p.sprite}.png`}
                  alt={p.name}
                  style={{ width: 72, height: 52, objectFit: 'contain' }}
                />
                <div style={{ fontSize: 11, fontWeight: 700, lineHeight: 1.2 }}>{p.name}</div>
              </button>
            );
          })}
        </div>
      ) : (
        <div className="soft-card" style={{ gap: 10 }}>
          <div>
            <div style={{ fontSize: 12, fontWeight: 800, marginBottom: 6 }}>Основной окрас</div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              {(Object.keys(BASE_COLORS) as BaseColorId[]).map((cid) => (
                <button
                  key={cid}
                  type="button"
                  onClick={() => updateCustom({ baseColor: cid })}
                  className={`tab-pill ${appearance.baseColor === cid ? 'active' : ''}`}
                  style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}
                >
                  <span
                    style={{
                      width: 12,
                      height: 12,
                      borderRadius: '50%',
                      background: BASE_COLORS[cid].hex,
                      border: '1px solid rgba(0,0,0,0.25)',
                    }}
                  />
                  {BASE_COLORS[cid].name}
                </button>
              ))}
            </div>
          </div>

          <div>
            <div style={{ fontSize: 12, fontWeight: 800, marginBottom: 6 }}>Рисунок шерсти</div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              {(Object.keys(PATTERN_NAMES) as PatternId[]).map((pid) => (
                <button
                  key={pid}
                  type="button"
                  onClick={() => updateCustom({ pattern: pid })}
                  className={`tab-pill ${appearance.pattern === pid ? 'active' : ''}`}
                >
                  {PATTERN_NAMES[pid]}
                </button>
              ))}
            </div>
          </div>

          {appearance.pattern !== 'solid' && (
            <div>
              <div style={{ fontSize: 12, fontWeight: 800, marginBottom: 6 }}>Цвет полосы / пятен</div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                {(Object.keys(BASE_COLORS) as BaseColorId[]).map((cid) => (
                  <button
                    key={cid}
                    type="button"
                    onClick={() => updateCustom({ markingColor: cid })}
                    className={`tab-pill ${appearance.markingColor === cid ? 'active' : ''}`}
                  >
                    {BASE_COLORS[cid].name}
                  </button>
                ))}
              </div>
            </div>
          )}

          {appearance.pattern === 'dorsal_stripe' && (
            <div style={{ display: 'flex', gap: 8 }}>
              <button
                type="button"
                className={`tab-pill ${!appearance.headCap ? 'active' : ''}`}
                onClick={() => onChangeAppearance({ ...appearance, headCap: false })}
              >
                Белая голова
              </button>
              <button
                type="button"
                className={`tab-pill ${appearance.headCap ? 'active' : ''}`}
                onClick={() => onChangeAppearance({ ...appearance, headCap: true })}
              >
                С «шапочкой» на голове
              </button>
            </div>
          )}
        </div>
      )}

      {/* Ears, Fur Texture, Eye Color, Sex */}
      <div className="grid-2" style={{ gap: 8 }}>
        <div className="soft-card" style={{ padding: 10 }}>
          <div style={{ fontSize: 12, fontWeight: 800 }}>Форма ушек</div>
          <div style={{ display: 'flex', gap: 6 }}>
            {(['standard', 'dumbo'] as EarType[]).map((e) => (
              <button
                key={e}
                type="button"
                className={`tab-pill ${appearance.ears === e ? 'active' : ''}`}
                onClick={() => onChangeAppearance({ ...appearance, ears: e })}
              >
                {e === 'standard' ? 'Обычные' : 'Дамбо'}
              </button>
            ))}
          </div>
        </div>

        <div className="soft-card" style={{ padding: 10 }}>
          <div style={{ fontSize: 12, fontWeight: 800 }}>Тип шерсти</div>
          <div style={{ display: 'flex', gap: 6 }}>
            {(['smooth', 'rex'] as CoatTexture[]).map((t) => (
              <button
                key={t}
                type="button"
                className={`tab-pill ${appearance.coatTexture === t ? 'active' : ''}`}
                onClick={() => onChangeAppearance({ ...appearance, coatTexture: t })}
              >
                {t === 'smooth' ? 'Гладкая' : 'Рекс (волнистая)'}
              </button>
            ))}
          </div>
        </div>

        <div className="soft-card" style={{ padding: 10 }}>
          <div style={{ fontSize: 12, fontWeight: 800 }}>Цвет глаз</div>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            {allowedEyes.map((ec: EyeColorId) => (
              <button
                key={ec}
                type="button"
                className={`tab-pill ${appearance.eyeColor === ec ? 'active' : ''}`}
                onClick={() => onChangeAppearance({ ...appearance, eyeColor: ec })}
              >
                {EYE_COLOR_INFO[ec].name}
              </button>
            ))}
          </div>
        </div>

        {onChangeSex && (
          <div className="soft-card" style={{ padding: 10 }}>
            <div style={{ fontSize: 12, fontWeight: 800 }}>
              Пол питомца {lockSex ? '(однополая пара)' : ''}
            </div>
            <div style={{ display: 'flex', gap: 6 }}>
              {(['female', 'male'] as RatSex[]).map((s) => (
                <button
                  key={s}
                  type="button"
                  disabled={lockSex}
                  className={`tab-pill ${sex === s ? 'active' : ''}`}
                  onClick={() => onChangeSex(s)}
                >
                  {s === 'female' ? 'Девочка' : 'Мальчик'}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
