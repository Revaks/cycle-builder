import { useEffect, useMemo, useState } from 'react';
import { X } from 'lucide-react';
import NumberInput from './NumberInput';
import { useProjectStore } from '../store/projectStore';
import { waveTargetPercent, type WavePayload } from '../store/projectActions';

interface WaveGeneratorDialogProps {
  open: boolean;
  onClose: () => void;
}

function toggleSet(set: Set<string>, id: string): Set<string> {
  const next = new Set(set);
  if (next.has(id)) next.delete(id);
  else next.add(id);
  return next;
}

export default function WaveGeneratorDialog({ open, onClose }: WaveGeneratorDialogProps) {
  const project = useProjectStore((state) => state.project);
  const applyWave = useProjectStore((state) => state.applyWave);
  const [selectedWeekIds, setSelectedWeekIds] = useState<Set<string>>(new Set());
  const [selectedExerciseIds, setSelectedExerciseIds] = useState<Set<string>>(new Set());
  const [mode, setMode] = useState<WavePayload['mode']>('linear');
  const [startPercent, setStartPercent] = useState(50);
  const [stepPercent, setStepPercent] = useState(5);

  useEffect(() => {
    if (!open) return;
    setSelectedWeekIds(new Set(project.weeks.map((week) => week.id)));
    setSelectedExerciseIds(new Set(project.exercises.map((exercise) => exercise.id)));
    setMode('linear');
    setStartPercent(50);
    setStepPercent(5);
    // Reset only when the dialog opens; edits while open must survive store updates.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const selectedWeeks = useMemo(
    () => project.weeks.filter((week) => selectedWeekIds.has(week.id)),
    [project.weeks, selectedWeekIds],
  );

  if (!open) return null;

  const allWeeks = selectedWeekIds.size === project.weeks.length;
  const allExercises = selectedExerciseIds.size === project.exercises.length;

  return (
    <div className="dialog-backdrop" role="presentation" onMouseDown={onClose}>
      <div
        className="dialog dialog-wide"
        role="dialog"
        aria-modal="true"
        aria-label="Генератор волны"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <div className="dialog-head">
          <div>
            <p className="eyebrow">Автоматизация</p>
            <h3>Генератор волны</h3>
            <p className="muted">
              Задаёт процент верхней группы. Разница между разминочными подходами сохраняется.
            </p>
          </div>
          <button type="button" className="icon-button" aria-label="Закрыть" onClick={onClose}>
            <X size={18} />
          </button>
        </div>

        <div className="wave-columns">
          <fieldset className="check-fieldset">
            <legend>Недели</legend>
            <label className="check-row">
              <input
                type="checkbox"
                checked={allWeeks}
                onChange={() =>
                  setSelectedWeekIds(
                    allWeeks ? new Set() : new Set(project.weeks.map((week) => week.id)),
                  )
                }
              />
              <strong>Все недели</strong>
            </label>
            <div className="check-list">
              {project.weeks.map((week) => (
                <label className="check-row" key={week.id}>
                  <input
                    type="checkbox"
                    checked={selectedWeekIds.has(week.id)}
                    onChange={() => setSelectedWeekIds(toggleSet(selectedWeekIds, week.id))}
                  />
                  {week.label}
                </label>
              ))}
            </div>
          </fieldset>

          <fieldset className="check-fieldset">
            <legend>Упражнения</legend>
            <label className="check-row">
              <input
                type="checkbox"
                checked={allExercises}
                onChange={() =>
                  setSelectedExerciseIds(
                    allExercises
                      ? new Set()
                      : new Set(project.exercises.map((exercise) => exercise.id)),
                  )
                }
              />
              <strong>Все упражнения</strong>
            </label>
            <div className="check-list">
              {project.exercises.map((exercise) => (
                <label className="check-row" key={exercise.id}>
                  <input
                    type="checkbox"
                    checked={selectedExerciseIds.has(exercise.id)}
                    onChange={() =>
                      setSelectedExerciseIds(toggleSet(selectedExerciseIds, exercise.id))
                    }
                  />
                  {exercise.name}
                </label>
              ))}
            </div>
          </fieldset>
        </div>

        <div className="wave-settings">
          <label className="field">
            <span>Режим</span>
            <select
              className="select-input"
              aria-label="Режим волны"
              value={mode}
              onChange={(event) => setMode(event.target.value as WavePayload['mode'])}
            >
              <option value="linear">Линейно</option>
              <option value="wave">Волна</option>
              <option value="constant">Постоянно</option>
            </select>
          </label>
          <label className="field">
            <span>Старт</span>
            <NumberInput
              label="Стартовый процент волны"
              value={startPercent}
              min={0}
              max={100}
              step={1}
              suffix="%"
              onChange={(value) => setStartPercent(value ?? 0)}
            />
          </label>
          <label className="field">
            <span>Шаг</span>
            <NumberInput
              label="Шаг волны"
              value={stepPercent}
              min={-20}
              max={20}
              step={1}
              suffix="%"
              onChange={(value) => setStepPercent(value ?? 0)}
            />
          </label>
        </div>

        <div className="wave-preview">
          <p className="eyebrow">Предпросмотр верхней группы</p>
          <div className="wave-preview-list">
            {selectedWeeks.map((week, index) => {
              const raw = waveTargetPercent(mode, startPercent, stepPercent, index);
              const target = Math.max(0, Math.min(100, raw));
              return (
                <span className="wave-preview-row" key={week.id}>
                  <span>{week.label}</span>
                  <strong>{Math.round(target * 10) / 10}%</strong>
                </span>
              );
            })}
            {selectedWeeks.length === 0 && <span className="muted">Выберите недели.</span>}
          </div>
        </div>

        <div className="dialog-actions">
          <button type="button" className="button button-ghost" onClick={onClose}>
            Отмена
          </button>
          <button
            type="button"
            className="button button-primary"
            disabled={selectedWeeks.length === 0 || selectedExerciseIds.size === 0}
            onClick={() => {
              applyWave({
                weekIds: selectedWeeks.map((week) => week.id),
                exerciseIds: Array.from(selectedExerciseIds),
                mode,
                startPercent,
                stepPercent,
              });
              onClose();
            }}
          >
            Применить
          </button>
        </div>
      </div>
    </div>
  );
}
