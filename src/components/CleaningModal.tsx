import React, { useState } from 'react';
import { CleaningMetrics } from '../types/game';

export type CleanActionId =
  | 'bedding'
  | 'litter'
  | 'bowls'
  | 'shelves'
  | 'hammock'
  | 'leftovers'
  | 'playpen';

interface CleaningModalProps {
  cleaning: CleaningMetrics;
  playpenUnlocked: boolean;
  onPerformClean: (action: CleanActionId) => void;
  onClose: () => void;
}

interface CleanTask {
  id: CleanActionId;
  title: string;
  toolLabel: string;
  sprite: string;
  value: number;
  note: string;
}

export const CleaningModal: React.FC<CleaningModalProps> = ({
  cleaning,
  playpenUnlocked,
  onPerformClean,
  onClose,
}) => {
  const [activeTask, setActiveTask] = useState<CleanTask | null>(null);
  const [tapsDone, setTapsDone] = useState(0);

  const tasks: CleanTask[] = [
    {
      id: 'bedding',
      title: 'Освежить загрязнённый наполнитель',
      toolLabel: 'Совок',
      sprite: 'litter_scoop',
      value: Math.round(cleaning.beddingClean),
      note: 'Точечно убираем мокрые кусочки, оставляя часть знакомых запахов.',
    },
    {
      id: 'litter',
      title: 'Очистить угловой лоток',
      toolLabel: 'Совок',
      sprite: 'litter_scoop',
      value: Math.round(cleaning.litterClean),
      note: 'Быстрая чистка лотка — клетка сразу становится свежее.',
    },
    {
      id: 'bowls',
      title: 'Помыть миски и поилку',
      toolLabel: 'Губка',
      sprite: 'sponge',
      value: Math.round(cleaning.bowlsClean),
      note: 'Чистая посуда и свежая вода — залог здоровья.',
    },
    {
      id: 'shelves',
      title: 'Протереть деревянные полки',
      toolLabel: 'Губка',
      sprite: 'sponge',
      value: Math.round(cleaning.shelvesClean),
      note: 'Мягкая влажная протирка без резких химических запахов.',
    },
    {
      id: 'hammock',
      title: 'Заменить гамак на свежий',
      toolLabel: 'Чистый гамак',
      sprite: 'clean_hammock',
      value: Math.round(cleaning.hammockClean),
      note: 'Меняем только один гамак за раз, чтобы питомцам было спокойно.',
    },
    {
      id: 'leftovers',
      title: `Собрать остатки еды (${cleaning.leftoversCount})`,
      toolLabel: 'Щётка и совок',
      sprite: 'brush_dustpan',
      value: cleaning.leftoversCount === 0 ? 100 : Math.max(25, 100 - cleaning.leftoversCount * 28),
      note: 'Скоропортящиеся кусочки овощей и фруктов убираем вовремя.',
    },
  ];

  if (playpenUnlocked) {
    tasks.push({
      id: 'playpen',
      title: 'Подмести игровой манеж',
      toolLabel: 'Щётка и совок',
      sprite: 'brush_dustpan',
      value: Math.round(cleaning.playpenClean),
      note: 'Собираем бумажки и крошки на мягком коврике манежа.',
    });
  }

  const handleMiniTap = () => {
    if (!activeTask) return;
    const next = tapsDone + 1;
    if (next >= 3) {
      onPerformClean(activeTask.id);
      setActiveTask(null);
      setTapsDone(0);
    } else {
      setTapsDone(next);
    }
  };

  return (
    <div className="panel-overlay" onClick={onClose}>
      <div className="panel-card" onClick={(e) => e.stopPropagation()}>
        <div className="panel-header">
          <h3 className="panel-title">
            <img src="./assets/sprites/sponge.png" alt="Уборка" />
            Бережный уход за домиком
          </h3>
          <button type="button" className="btn-close" onClick={onClose}>×</button>
        </div>

        <div className="panel-body" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div className="soft-card" style={{ flexDirection: 'row', alignItems: 'center', gap: 12, background: '#F4F8F2' }}>
            <img src="./assets/sprites/carrier.png" alt="Переноска" style={{ width: 64, height: 54, objectFit: 'contain' }} />
            <div style={{ fontSize: 13, lineHeight: 1.4 }}>
              <strong>Крыски сейчас в безопасной переноске!</strong>
              <div style={{ color: 'var(--text-muted)' }}>
                Им спокойно, пока вы наводите порядок. Старайтесь не стерилизовать всё сразу: знакомые запахи ({Math.round(cleaning.familiarScent)}%) дарят питомцам чувство дома.
              </div>
            </div>
          </div>

          {activeTask ? (
            <div className="soft-card highlight" style={{ alignItems: 'center', textAlign: 'center', gap: 12, padding: 18 }}>
              <img src={`./assets/sprites/${activeTask.sprite}.png`} alt={activeTask.toolLabel} style={{ width: 78, height: 78, objectFit: 'contain' }} />
              <div style={{ fontWeight: 800, fontSize: 16 }}>{activeTask.title}</div>
              <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>
                Нажмите 3 раза мягкими движениями, чтобы аккуратно прибрать ({tapsDone}/3)
              </div>
              <div className="stat-bar" style={{ width: '100%', maxWidth: 260, height: 12 }}>
                <div className="stat-fill" style={{ width: `${(tapsDone / 3) * 100}%` }} />
              </div>
              <div style={{ display: 'flex', gap: 10 }}>
                <button type="button" className="btn btn-primary" onClick={handleMiniTap}>
                  Убрать ({activeTask.toolLabel}) ✨
                </button>
                <button type="button" className="btn btn-outline" onClick={() => { setActiveTask(null); setTapsDone(0); }}>
                  Отмена
                </button>
              </div>
            </div>
          ) : (
            <div className="grid-2">
              {tasks.map((t) => {
                const alreadyFresh = t.value >= 96 && t.id !== 'leftovers';
                return (
                  <div key={t.id} className="soft-card">
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <img src={`./assets/sprites/${t.sprite}.png`} alt={t.title} style={{ width: 42, height: 42, objectFit: 'contain' }} />
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: 13, fontWeight: 800 }}>{t.title}</div>
                        <div className="stat-bar" style={{ marginTop: 4 }}>
                          <div className={`stat-fill ${t.value < 45 ? 'low' : t.value < 70 ? 'warn' : ''}`} style={{ width: `${t.value}%` }} />
                        </div>
                      </div>
                      <span style={{ fontSize: 12, fontWeight: 800 }}>{t.value}%</span>
                    </div>
                    <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{t.note}</div>
                    <button
                      type="button"
                      disabled={alreadyFresh || (t.id === 'leftovers' && cleaning.leftoversCount === 0)}
                      className="btn btn-soft btn-sm"
                      onClick={() => { setActiveTask(t); setTapsDone(0); }}
                    >
                      {alreadyFresh || (t.id === 'leftovers' && cleaning.leftoversCount === 0)
                        ? 'Здесь уже чисто'
                        : 'Прибрать'}
                    </button>
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
