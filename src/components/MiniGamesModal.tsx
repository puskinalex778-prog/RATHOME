import React, { useEffect, useState } from 'react';
import { TRICKS_CATALOG } from '../data/catalog';
import { RatEntity, TrickId } from '../types/game';

interface MiniGamesModalProps {
  rats: RatEntity[];
  selectedRatId: string | null;
  gameTreats: number;
  onClose: () => void;
  onCompleteGame: (params: {
    ratId: string;
    rewardCoins: number;
    trustGain: number;
    learnedTrick?: TrickId;
    useTreat: boolean;
    message: string;
  }) => void;
  onTrigger3DTrick: (ratId: string, trick: TrickId) => void;
}

type MiniTab = 'forage' | 'tunnel' | 'maze' | 'target' | 'tricks';

// Simple cozy 5x5 cardboard maze (0 = path, 1 = cardboard wall)
const MAZE_GRID = [
  [0, 0, 1, 0, 0],
  [1, 0, 1, 0, 1],
  [0, 0, 0, 0, 0],
  [0, 1, 1, 1, 0],
  [0, 0, 0, 0, 0],
];

export const MiniGamesModal: React.FC<MiniGamesModalProps> = ({
  rats,
  selectedRatId,
  gameTreats,
  onClose,
  onCompleteGame,
  onTrigger3DTrick,
}) => {
  const [tab, setTab] = useState<MiniTab>('forage');
  const [activeRatId, setActiveRatId] = useState<string>(selectedRatId || rats[0]?.id || '');

  const rat = rats.find((r) => r.id === activeRatId) || rats[0];

  // 1. Foraging game state
  const [forageHidden, setForageHidden] = useState<number>(() => Math.floor(Math.random() * 3));
  const [forageFeedback, setForageFeedback] = useState<string>('Спрячьте зёрнышко или отгадайте, в какой коробочке лакомство!');
  const [forageFound, setForageFound] = useState(false);

  // 2. Tunnel choice game state
  const [tunnelHint, setTunnelHint] = useState<number>(() => Math.floor(Math.random() * 3));
  const [tunnelShowCue, setTunnelShowCue] = useState(true);
  const [tunnelStatus, setTunnelStatus] = useState('Запомните подсвеченный туннель и позовите крыску!');

  // 3. Simple Maze state
  const [mazePos, setMazePos] = useState<{ r: number; c: number }>({ r: 0, c: 0 });
  const [mazeWon, setMazeWon] = useState(false);

  // 4. Nose-to-Target timing game
  const [targetX, setTargetX] = useState(50);
  const [targetHits, setTargetHits] = useState(0);

  useEffect(() => {
    if (tab !== 'tunnel') return;
    setTunnelShowCue(true);
    const id = window.setTimeout(() => setTunnelShowCue(false), 1600);
    return () => window.clearTimeout(id);
  }, [tab, tunnelHint]);

  useEffect(() => {
    if (tab !== 'target') return;
    let frame = 0;
    let t = 0;
    const step = () => {
      t += 0.045;
      setTargetX(50 + Math.sin(t) * 40);
      frame = requestAnimationFrame(step);
    };
    frame = requestAnimationFrame(step);
    return () => cancelAnimationFrame(frame);
  }, [tab]);

  if (!rat) return null;

  const isTired = rat.energy < 28;

  const pickForageBox = (idx: number) => {
    if (forageFound) return;
    if (idx === forageHidden) {
      setForageFound(true);
      setForageFeedback(`${rat.name} радостно нашла угощение по запаху и держит его лапками!`);
      onCompleteGame({
        ratId: rat.id,
        rewardCoins: 18,
        trustGain: 5,
        useTreat: gameTreats > 0,
        message: `${rat.name} отлично справилась с поиском лакомства! +18 монет`,
      });
    } else {
      setForageFeedback(`${rat.name} обнюхала коробочку — тут пусто, но она с интересом ищет дальше!`);
    }
  };

  const resetForage = () => {
    setForageHidden(Math.floor(Math.random() * 3));
    setForageFound(false);
    setForageFeedback('Новое зёрнышко спрятано! Выберите коробочку.');
  };

  const pickTunnel = (idx: number) => {
    if (tunnelShowCue) return;
    if (idx === tunnelHint) {
      setTunnelStatus(`Ура! ${rat.name} пробежала точно по нужному туннелю!`);
      onCompleteGame({
        ratId: rat.id,
        rewardCoins: 20,
        trustGain: 5,
        useTreat: gameTreats > 0,
        message: `${rat.name} выбрала правильный туннель! +20 монет`,
      });
      setTimeout(() => {
        setTunnelHint(Math.floor(Math.random() * 3));
        setTunnelStatus('Отлично! Запоминаем новый туннель...');
      }, 1100);
    } else {
      setTunnelStatus(`${rat.name} заглянула не туда, но ничего страшного — попробуем снова без спешки!`);
      setTimeout(() => setTunnelHint(Math.floor(Math.random() * 3)), 900);
    }
  };

  const moveMaze = (dr: number, dc: number) => {
    if (mazeWon) return;
    const nr = mazePos.r + dr;
    const nc = mazePos.c + dc;
    if (nr < 0 || nr >= 5 || nc < 0 || nc >= 5) return;
    if (MAZE_GRID[nr][nc] === 1) return;
    setMazePos({ r: nr, c: nc });
    if (nr === 4 && nc === 4) {
      setMazeWon(true);
      onCompleteGame({
        ratId: rat.id,
        rewardCoins: 24,
        trustGain: 6,
        useTreat: gameTreats > 0,
        message: `${rat.name} прошла картонный лабиринт и получила угощение! +24 монеты`,
      });
    }
  };

  const tapTargetStick = () => {
    if (Math.abs(targetX - 50) <= 16) {
      const next = targetHits + 1;
      setTargetHits(next);
      onTrigger3DTrick(rat.id, 'touch_target');
      if (next >= 3) {
        setTargetHits(0);
        onCompleteGame({
          ratId: rat.id,
          rewardCoins: 22,
          trustGain: 7,
          learnedTrick: 'touch_target',
          useTreat: gameTreats > 0,
          message: `${rat.name} освоила касание мишени носом! +22 монеты`,
        });
      }
    }
  };

  const practiceTrick = (trickId: TrickId) => {
    const def = TRICKS_CATALOG[trickId];
    const already = rat.learnedTricks.includes(trickId);
    onTrigger3DTrick(rat.id, trickId);
    onCompleteGame({
      ratId: rat.id,
      rewardCoins: already ? 12 : def.rewardCoins,
      trustGain: already ? 3 : 8,
      learnedTrick: trickId,
      useTreat: gameTreats > 0,
      message: already
        ? `${rat.name} с радостью повторила трюк «${def.name}»! +12 монет`
        : `${rat.name} выучила новый трюк «${def.name}»! +${def.rewardCoins} монет`,
    });
  };

  return (
    <div className="panel-overlay" onClick={onClose}>
      <div className="panel-card" onClick={(e) => e.stopPropagation()}>
        <div className="panel-header">
          <h3 className="panel-title">
            <img src="./assets/sprites/training_target.png" alt="Игры" />
            Игры и доброе обучение
          </h3>
          <button type="button" className="btn-close" onClick={onClose}>×</button>
        </div>

        <div className="panel-body" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {/* Rat selector + gentle voluntary notice */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 }}>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              {rats.map((r) => (
                <button
                  key={r.id}
                  type="button"
                  className={`tab-pill ${r.id === rat.id ? 'active' : ''}`}
                  onClick={() => setActiveRatId(r.id)}
                >
                  {r.name} (Энергия {r.energy}%)
                </button>
              ))}
            </div>
            <span className="chip">Игровых зёрнышек: {gameTreats}</span>
          </div>

          {isTired && (
            <div className="soft-card" style={{ background: '#FFF6EB', borderColor: '#E0B47A', fontSize: 13 }}>
              {rat.name} сейчас немного устала и хочет подремать в гамаке. Можно завершить занятие без штрафа или выбрать другую крыску!
            </div>
          )}

          <div className="tabs-row" style={{ marginBottom: 0 }}>
            <button type="button" className={`tab-pill ${tab === 'forage' ? 'active' : ''}`} onClick={() => setTab('forage')}>
              Поиск лакомства
            </button>
            <button type="button" className={`tab-pill ${tab === 'maze' ? 'active' : ''}`} onClick={() => setTab('maze')}>
              Лабиринт
            </button>
            <button type="button" className={`tab-pill ${tab === 'tunnel' ? 'active' : ''}`} onClick={() => setTab('tunnel')}>
              Выбор туннеля
            </button>
            <button type="button" className={`tab-pill ${tab === 'target' ? 'active' : ''}`} onClick={() => setTab('target')}>
              Мишень носом
            </button>
            <button type="button" className={`tab-pill ${tab === 'tricks' ? 'active' : ''}`} onClick={() => setTab('tricks')}>
              Трюки ({rat.learnedTricks.length}/6)
            </button>
          </div>

          {/* 1. Foraging */}
          {tab === 'forage' && (
            <div className="soft-card" style={{ alignItems: 'center', textAlign: 'center', gap: 12 }}>
              <div style={{ fontSize: 14, fontWeight: 700 }}>{forageFeedback}</div>
              <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
                {[0, 1, 2].map((idx) => (
                  <button
                    key={idx}
                    type="button"
                    disabled={isTired}
                    onClick={() => pickForageBox(idx)}
                    className="soft-card"
                    style={{
                      width: 112,
                      alignItems: 'center',
                      cursor: 'pointer',
                      borderColor: forageFound && idx === forageHidden ? 'var(--sage)' : undefined,
                      background: forageFound && idx === forageHidden ? 'var(--sage-soft)' : '#fff',
                    }}
                  >
                    <img src="./assets/sprites/foraging_box.png" alt="Коробка" style={{ width: 64, height: 54, objectFit: 'contain' }} />
                    <span style={{ fontSize: 12, fontWeight: 800 }}>Коробка {idx + 1}</span>
                  </button>
                ))}
              </div>
              {forageFound && (
                <button type="button" className="btn btn-primary btn-sm" onClick={resetForage}>
                  Спрятать ещё раз
                </button>
              )}
            </div>
          )}

          {/* 2. Simple Cardboard Maze */}
          {tab === 'maze' && (
            <div className="soft-card" style={{ alignItems: 'center', gap: 10 }}>
              <div style={{ fontSize: 13, fontWeight: 700 }}>
                {mazeWon
                  ? `${rat.name} добралась до вкусняшки!`
                  : `Помогите ${rat.name} пройти безопасный картонный лабиринт к угощению!`}
              </div>
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(5, 42px)',
                  gap: 4,
                  background: '#E8DAC6',
                  padding: 8,
                  borderRadius: 14,
                }}
              >
                {MAZE_GRID.map((row, r) =>
                  row.map((cell, c) => {
                    const isRat = mazePos.r === r && mazePos.c === c;
                    const isGoal = r === 4 && c === 4;
                    return (
                      <div
                        key={`${r}-${c}`}
                        style={{
                          width: 42,
                          height: 42,
                          borderRadius: 8,
                          background: cell === 1 ? '#A9845B' : isGoal ? '#DFF0DE' : '#FAF5ED',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: 18,
                          fontWeight: 800,
                        }}
                      >
                        {isRat ? '🐭' : isGoal ? '🫐' : ''}
                      </div>
                    );
                  })
                )}
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <button type="button" className="btn btn-soft btn-sm" disabled={isTired} onClick={() => moveMaze(-1, 0)}>▲</button>
                <button type="button" className="btn btn-soft btn-sm" disabled={isTired} onClick={() => moveMaze(0, -1)}>◀</button>
                <button type="button" className="btn btn-soft btn-sm" disabled={isTired} onClick={() => moveMaze(1, 0)}>▼</button>
                <button type="button" className="btn btn-soft btn-sm" disabled={isTired} onClick={() => moveMaze(0, 1)}>▶</button>
                {mazeWon && (
                  <button
                    type="button"
                    className="btn btn-primary btn-sm"
                    onClick={() => {
                      setMazePos({ r: 0, c: 0 });
                      setMazeWon(false);
                    }}
                  >
                    Сначала
                  </button>
                )}
              </div>
            </div>
          )}

          {/* 3. Tunnel Choice */}
          {tab === 'tunnel' && (
            <div className="soft-card" style={{ alignItems: 'center', textAlign: 'center', gap: 12 }}>
              <div style={{ fontSize: 14, fontWeight: 700 }}>{tunnelStatus}</div>
              <div style={{ display: 'flex', gap: 10, justifyContent: 'center', flexWrap: 'wrap' }}>
                {['Зелёный', 'Кремовый', 'Персиковый'].map((label, idx) => (
                  <button
                    key={label}
                    type="button"
                    disabled={isTired || tunnelShowCue}
                    onClick={() => pickTunnel(idx)}
                    className="soft-card"
                    style={{
                      width: 112,
                      alignItems: 'center',
                      cursor: 'pointer',
                      borderWidth: 2.5,
                      borderColor: tunnelShowCue && idx === tunnelHint ? '#54A364' : undefined,
                      background: tunnelShowCue && idx === tunnelHint ? '#E3F6E5' : '#fff',
                    }}
                  >
                    <img src="./assets/sprites/tunnel.png" alt="Туннель" style={{ width: 68, height: 50, objectFit: 'contain' }} />
                    <span style={{ fontSize: 12, fontWeight: 800 }}>{label}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* 4. Nose-to-Target Training */}
          {tab === 'target' && (
            <div className="soft-card" style={{ alignItems: 'center', textAlign: 'center', gap: 12 }}>
              <div style={{ fontSize: 14, fontWeight: 700 }}>
                Нажмите «Коснуться носом!», когда зелёная мишень окажется в центре ({targetHits}/3)
              </div>
              <div
                style={{
                  position: 'relative',
                  width: '100%',
                  maxWidth: 340,
                  height: 54,
                  background: '#EFE7DB',
                  borderRadius: 999,
                  overflow: 'hidden',
                }}
              >
                <div
                  style={{
                    position: 'absolute',
                    left: '36%',
                    width: '28%',
                    top: 0,
                    bottom: 0,
                    background: 'rgba(111,134,114,0.28)',
                  }}
                />
                <div
                  style={{
                    position: 'absolute',
                    left: `calc(${targetX}% - 22px)`,
                    top: 5,
                    width: 44,
                    height: 44,
                    borderRadius: '50%',
                    background: '#5E8E7E',
                    border: '3px solid #fff',
                    boxShadow: '0 4px 10px rgba(0,0,0,0.18)',
                  }}
                />
              </div>
              <button type="button" className="btn btn-primary" disabled={isTired} onClick={tapTargetStick}>
                Коснуться носом!
              </button>
            </div>
          )}

          {/* 5. Trick Training (Positive Reinforcement) */}
          {tab === 'tricks' && (
            <div className="grid-2">
              {(Object.keys(TRICKS_CATALOG) as TrickId[]).map((tid) => {
                const def = TRICKS_CATALOG[tid];
                const learned = rat.learnedTricks.includes(tid);
                const enoughTrust = rat.trust >= def.minTrust;
                return (
                  <div key={tid} className={`soft-card ${learned ? 'highlight' : ''}`}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <strong style={{ fontSize: 14 }}>{def.name}</strong>
                      {learned && <span className="chip">Изучен</span>}
                    </div>
                    <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{def.description}</div>
                    <button
                      type="button"
                      disabled={isTired || !enoughTrust}
                      className={`btn btn-sm ${learned ? 'btn-soft' : 'btn-primary'}`}
                      onClick={() => practiceTrick(tid)}
                    >
                      {enoughTrust
                        ? learned
                          ? 'Повторить за похвалу (+12)'
                          : `Обучить (+${def.rewardCoins} монет)`
                        : `Нужно доверие ${def.minTrust}%`}
                    </button>
                  </div>
                );
              })}
            </div>
          )}

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 12, color: 'var(--text-muted)' }}>
            <span>Обучение всегда добровольное — без голода и без штрафов.</span>
            <button type="button" className="btn btn-outline btn-sm" onClick={onClose}>
              Закончить занятие
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
