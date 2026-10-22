import { useEffect, useState } from 'react';
import { CalendarDays, Layers3, Settings2, Timer, Waves, Weight } from 'lucide-react';
import ConfirmDialog from '../components/ConfirmDialog';
import DayCard from '../components/DayCard';
import StructureEditor from '../components/StructureEditor';
import WaveGeneratorDialog from '../components/WaveGeneratorDialog';
import WeekTabs from '../components/WeekTabs';
import { useComputedCycle } from '../selectors/useComputedCycle';
import { useProjectStore } from '../store/projectStore';
import { formatKg, formatMinutes } from '../utils/format';

interface ProgramPageProps {
  initialWeekId?: string;
}

export default function ProgramPage({ initialWeekId }: ProgramPageProps) {
  const { cycle, issues } = useComputedCycle();
  const addWeek = useProjectStore((state) => state.addWeek);
  const duplicateWeek = useProjectStore((state) => state.duplicateWeek);
  const removeWeek = useProjectStore((state) => state.removeWeek);
  const setWeekDeload = useProjectStore((state) => state.setWeekDeload);
  const [selectedWeekId, setSelectedWeekId] = useState<string | undefined>(initialWeekId);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [structureOpen, setStructureOpen] = useState(false);
  const [waveOpen, setWaveOpen] = useState(false);

  useEffect(() => {
    if (initialWeekId) setSelectedWeekId(initialWeekId);
  }, [initialWeekId]);

  useEffect(() => {
    if (cycle.weeks.length === 0) {
      if (selectedWeekId !== undefined) setSelectedWeekId(undefined);
      return;
    }
    if (!cycle.weeks.some((week) => week.weekId === selectedWeekId)) {
      setSelectedWeekId(cycle.weeks[0].weekId);
    }
  }, [cycle.weeks, selectedWeekId]);

  const selectedWeek =
    cycle.weeks.find((week) => week.weekId === selectedWeekId) ?? cycle.weeks[0];

  const handleAdd = () => {
    addWeek();
    const weeks = useProjectStore.getState().project.weeks;
    setSelectedWeekId(weeks.at(-1)?.id);
  };

  const handleDuplicate = () => {
    if (!selectedWeek) return;
    const sourceId = selectedWeek.weekId;
    duplicateWeek(sourceId);
    const weeks = useProjectStore.getState().project.weeks;
    const index = weeks.findIndex((week) => week.id === sourceId);
    setSelectedWeekId(weeks[index + 1]?.id ?? sourceId);
  };

  const handleDelete = () => {
    if (!selectedWeek) return;
    const currentIndex = cycle.weeks.findIndex((week) => week.weekId === selectedWeek.weekId);
    removeWeek(selectedWeek.weekId);
    const weeks = useProjectStore.getState().project.weeks;
    const fallback = weeks[currentIndex] ?? weeks[currentIndex - 1] ?? weeks[0];
    setSelectedWeekId(fallback?.id);
    setDeleteOpen(false);
  };

  if (cycle.weeks.length === 0) {
    return (
      <div className="program-page">
        <section className="page-heading">
          <div>
            <p className="eyebrow">Программа</p>
            <h2>В цикле нет недель</h2>
            <p className="muted">Добавьте первую неделю, чтобы начать программу.</p>
          </div>
          <button type="button" className="button button-primary" onClick={handleAdd}>
            Добавить неделю
          </button>
        </section>
        <div className="card empty-card">
          <p className="empty-state">Пока пусто. Неделя создаст дни по текущей структуре.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="program-page">
      <section className="page-heading">
        <div>
          <p className="eyebrow">Конструктор</p>
          <h2>Программа тренировок</h2>
          <p className="muted">
            Меняйте подходы, повторы и проценты — рабочий вес и итоги пересчитываются сразу.
          </p>
        </div>
        <div className="header-actions">
          <button
            type="button"
            className="button button-ghost"
            onClick={() => setStructureOpen((open) => !open)}
          >
            <Settings2 size={17} />
            Структура
          </button>
          <button type="button" className="button button-ghost" onClick={() => setWaveOpen(true)}>
            <Waves size={17} />
            Волна
          </button>
          <button type="button" className="button button-primary" onClick={handleAdd}>
            <Layers3 size={17} />
            Добавить неделю
          </button>
        </div>
      </section>

      <WeekTabs
        weeks={cycle.weeks}
        selectedId={selectedWeek?.weekId}
        onSelect={setSelectedWeekId}
        onAdd={handleAdd}
        onDuplicate={handleDuplicate}
        onDelete={() => setDeleteOpen(true)}
      />

      {structureOpen && selectedWeek && <StructureEditor weekId={selectedWeek.weekId} />}

      {selectedWeek && (
        <>
          <section className="card week-summary">
            <div className="week-summary-title">
              <div>
                <p className="eyebrow">Выбрано</p>
                <h3>{selectedWeek.label}</h3>
              </div>
              <div className="week-summary-controls">
                {selectedWeek.isDeload && <span className="badge badge-warning">разгрузка</span>}
                <label className="deload-toggle">
                  <input
                    type="checkbox"
                    aria-label="Разгрузочная неделя"
                    checked={selectedWeek.isDeload}
                    onChange={(event) =>
                      setWeekDeload(selectedWeek.weekId, event.target.checked)
                    }
                  />
                  Разгрузочная
                </label>
              </div>
            </div>
            <div className="week-summary-metrics">
              <span>
                <Weight size={16} />
                <small>Тоннаж</small>
                <strong>{Math.round(selectedWeek.tonnage)} кг</strong>
              </span>
              <span>
                <Layers3 size={16} />
                <small>КПШ</small>
                <strong>{selectedWeek.kpsh}</strong>
              </span>
              <span>
                <Timer size={16} />
                <small>Время</small>
                <strong>{formatMinutes(selectedWeek.timeMinutes)}</strong>
              </span>
              <span>
                <CalendarDays size={16} />
                <small>Средний вес</small>
                <strong>{formatKg(selectedWeek.avgWeight)}</strong>
              </span>
            </div>
          </section>

          <div className="day-grid">
            {selectedWeek.days.map((day) => (
              <DayCard
                key={day.dayTemplateId}
                day={day}
                weekId={selectedWeek.weekId}
                issues={issues}
              />
            ))}
          </div>
        </>
      )}

      <ConfirmDialog
        open={deleteOpen}
        title="Удалить неделю?"
        message={
          selectedWeek
            ? `«${selectedWeek.label}» и все её тренировки будут удалены. Это действие нельзя отменить.`
            : ''
        }
        confirmLabel="Удалить неделю"
        onCancel={() => setDeleteOpen(false)}
        onConfirm={handleDelete}
      />

      <WaveGeneratorDialog open={waveOpen} onClose={() => setWaveOpen(false)} />
    </div>
  );
}
