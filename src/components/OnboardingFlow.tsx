import React, { useState } from 'react';
import { SUGGESTED_NAMES_FEMALE, SUGGESTED_NAMES_MALE } from '../data/coats';
import {
  createRat,
  createStarterAppearance1,
  createStarterAppearance2,
} from '../simulation/gameLogic';
import { RatAppearance, RatEntity, RatSex } from '../types/game';
import { RatAppearanceEditor } from './RatAppearanceEditor';

interface OnboardingFlowProps {
  hasSavedGame: boolean;
  onContinueSaved: () => void;
  onConfirmPair: (rat1: RatEntity, rat2: RatEntity) => void;
}

export const OnboardingFlow: React.FC<OnboardingFlowProps> = ({
  hasSavedGame,
  onContinueSaved,
  onConfirmPair,
}) => {
  const [step, setStep] = useState<'title' | 'choose'>('title');
  const [showPlaqueModal, setShowPlaqueModal] = useState(false);
  const [pairSex, setPairSex] = useState<RatSex>('female');
  const [activeSlot, setActiveSlot] = useState<0 | 1>(0);

  const [name1, setName1] = useState('Полоска');
  const [name2, setName2] = useState('Дымка');
  const [app1, setApp1] = useState<RatAppearance>(() => createStarterAppearance1());
  const [app2, setApp2] = useState<RatAppearance>(() => createStarterAppearance2());

  const handleSexSwitch = (sex: RatSex) => {
    setPairSex(sex);
    if (sex === 'male' && name1 === 'Полоска') setName1('Шустрик');
    if (sex === 'male' && name2 === 'Дымка') setName2('Дымок');
    if (sex === 'female' && name1 === 'Шустрик') setName1('Полоска');
    if (sex === 'female' && name2 === 'Дымок') setName2('Дымка');
  };

  const suggestName = (slot: 0 | 1) => {
    const pool = pairSex === 'female' ? SUGGESTED_NAMES_FEMALE : SUGGESTED_NAMES_MALE;
    const pick = pool[Math.floor(Math.random() * pool.length)];
    if (slot === 0) setName1(pick);
    else setName2(pick);
  };

  const handleConfirm = () => {
    const rat1 = createRat({
      name: name1.trim() || 'Полоска',
      sex: pairSex,
      appearance: app1,
      personality: 'cautious',
      ageDays: 28,
      initialTrust: 20,
    });
    const rat2 = createRat({
      name: name2.trim() || 'Дымка',
      sex: pairSex,
      appearance: app2,
      personality: 'curious',
      ageDays: 28,
      initialTrust: 22,
    });
    onConfirmPair(rat1, rat2);
  };

  return (
    <div
      className="welcome-screen"
      style={{ backgroundImage: 'url(./assets/bg_room.jpg)' }}
    >
      <div className="welcome-scrim" />

      {step === 'title' ? (
        <div className="welcome-box" style={{ maxWidth: 520, textAlign: 'center' }}>
          <img
            src="./assets/app_icon_512.png"
            alt="Крыски дома"
            style={{
              width: 118,
              height: 118,
              borderRadius: 28,
              boxShadow: '0 10px 26px rgba(51,43,36,0.2)',
              marginBottom: 10,
            }}
          />
          <h1 style={{ margin: '0 0 6px', fontSize: 30, fontWeight: 900, color: '#332B24' }}>
            Крыски дома
          </h1>
          <p style={{ margin: '0 0 18px', color: 'var(--text-muted)', fontSize: 15, lineHeight: 1.45 }}>
            Уютный 3D-симулятор декоративных домашних крыс. Обустраивайте просторную клетку, приручайте питомцев с живым характером и наблюдайте за их дружбой.
          </p>

          <div style={{ display: 'flex', justifyContent: 'center', gap: 10, marginBottom: 18 }}>
            <img
              src="./assets/sprites/white_gray_back_stripe.png"
              alt="Белая с серой полоской"
              style={{ width: 120, height: 84, objectFit: 'contain' }}
            />
            <img
              src="./assets/sprites/solid_gray.png"
              alt="Полностью серая"
              style={{ width: 120, height: 84, objectFit: 'contain' }}
            />
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {hasSavedGame && (
              <button
                type="button"
                className="btn btn-primary"
                style={{ padding: '14px 20px', fontSize: 16 }}
                onClick={onContinueSaved}
              >
                Продолжить игру
              </button>
            )}
            <button
              type="button"
              className={`btn ${hasSavedGame ? 'btn-soft' : 'btn-primary'}`}
              style={{ padding: '14px 20px', fontSize: 16 }}
              onClick={() => setStep('choose')}
            >
              {hasSavedGame ? 'Начать новую семью крысок' : 'Познакомиться с крысятами'}
            </button>
          </div>

          <button
            type="button"
            onClick={() => setShowPlaqueModal(true)}
            style={{
              marginTop: 16,
              width: '100%',
              background: '#FAF4EA',
              border: '1.5px solid rgba(198, 158, 110, 0.45)',
              borderRadius: 16,
              padding: '8px 12px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 10,
              cursor: 'pointer',
            }}
          >
            <img
              src="./assets/dedication_plaque.png"
              alt="Посвящается: Тимме, Жоржу, Васе, Элвину"
              style={{ width: 62, height: 49, objectFit: 'contain', borderRadius: 6 }}
            />
            <div style={{ textAlign: 'left' }}>
              <div style={{ fontSize: 12, fontWeight: 800, color: '#6E4C36' }}>
                Посвящается: Тимме, Жоржу, Васе, Элвину
              </div>
              <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                Нажмите, чтобы открыть памятный рисунок ♥
              </div>
            </div>
          </button>

          {showPlaqueModal && (
            <div
              className="panel-overlay"
              style={{ alignItems: 'center', zIndex: 100 }}
              onClick={() => setShowPlaqueModal(false)}
            >
              <div
                className="soft-card"
                style={{ maxWidth: 480, width: '92vw', padding: 14, alignItems: 'center', gap: 10 }}
                onClick={(e) => e.stopPropagation()}
              >
                <img
                  src="./assets/dedication_plaque.png"
                  alt="Посвящается: Тимме, Жоржу, Васе, Элвину"
                  style={{ width: '100%', borderRadius: 12 }}
                />
                <button
                  type="button"
                  className="btn btn-soft btn-sm"
                  onClick={() => setShowPlaqueModal(false)}
                >
                  Закрыть
                </button>
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="welcome-box">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, marginBottom: 10 }}>
            <div>
              <h2 style={{ margin: 0, fontSize: 21, fontWeight: 900 }}>
                Центр пристройства крысят
              </h2>
              <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>
                Крысы — социальные животные, поэтому вы забираете домой сразу двух дружелюбных малышей одного пола.
              </div>
            </div>
            <img
              src="./assets/sprites/carrier.png"
              alt="Переноска"
              style={{ width: 58, height: 58, objectFit: 'contain', flexShrink: 0 }}
            />
          </div>

          {/* Choose pair sex */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12, flexWrap: 'wrap' }}>
            <span style={{ fontSize: 13, fontWeight: 800 }}>Пол пары:</span>
            <button
              type="button"
              className={`tab-pill ${pairSex === 'female' ? 'active' : ''}`}
              onClick={() => handleSexSwitch('female')}
            >
              Две девочки
            </button>
            <button
              type="button"
              className={`tab-pill ${pairSex === 'male' ? 'active' : ''}`}
              onClick={() => handleSexSwitch('male')}
            >
              Два мальчика
            </button>
          </div>

          {/* Switch between Rat 1 and Rat 2 */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 12 }}>
            <button
              type="button"
              onClick={() => setActiveSlot(0)}
              className={`soft-card ${activeSlot === 0 ? 'highlight' : ''}`}
              style={{ cursor: 'pointer', flexDirection: 'row', alignItems: 'center', padding: 10 }}
            >
              <img
                src="./assets/sprites/white_gray_back_stripe.png"
                alt="Первая крыска"
                style={{ width: 52, height: 40, objectFit: 'contain' }}
              />
              <div style={{ textAlign: 'left' }}>
                <div style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 700 }}>Крысёнок 1</div>
                <div style={{ fontSize: 15, fontWeight: 900 }}>{name1 || 'Полоска'}</div>
              </div>
            </button>
            <button
              type="button"
              onClick={() => setActiveSlot(1)}
              className={`soft-card ${activeSlot === 1 ? 'highlight' : ''}`}
              style={{ cursor: 'pointer', flexDirection: 'row', alignItems: 'center', padding: 10 }}
            >
              <img
                src="./assets/sprites/solid_gray.png"
                alt="Вторая крыска"
                style={{ width: 52, height: 40, objectFit: 'contain' }}
              />
              <div style={{ textAlign: 'left' }}>
                <div style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 700 }}>Крысёнок 2</div>
                <div style={{ fontSize: 15, fontWeight: 900 }}>{name2 || 'Дымка'}</div>
              </div>
            </button>
          </div>

          {/* Name input for selected baby rat */}
          <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
            <input
              type="text"
              className="text-input"
              maxLength={18}
              value={activeSlot === 0 ? name1 : name2}
              onChange={(e) => (activeSlot === 0 ? setName1(e.target.value) : setName2(e.target.value))}
              placeholder="Придумайте имя крыске..."
            />
            <button
              type="button"
              className="btn btn-soft btn-sm"
              style={{ whiteSpace: 'nowrap' }}
              onClick={() => suggestName(activeSlot)}
            >
              Идея имени
            </button>
          </div>

          <RatAppearanceEditor
            appearance={activeSlot === 0 ? app1 : app2}
            sex={pairSex}
            lockSex
            creativeMode={false}
            onChangeAppearance={(next) => (activeSlot === 0 ? setApp1(next) : setApp2(next))}
            title={`Настройка внешности: ${activeSlot === 0 ? name1 || 'Крысёнок 1' : name2 || 'Крысёнок 2'}`}
          />

          <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, marginTop: 14 }}>
            <button type="button" className="btn btn-outline" onClick={() => setStep('title')}>
              Назад
            </button>
            <button type="button" className="btn btn-primary" style={{ flex: 1 }} onClick={handleConfirm}>
              Забрать малышей домой в переноске!
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
