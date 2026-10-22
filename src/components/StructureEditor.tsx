import { useEffect, useState } from 'react';
import { ArrowDown, ArrowUp, Plus, Trash2, X } from 'lucide-react';
import ConfirmDialog from './ConfirmDialog';
import { useProjectStore } from '../store/projectStore';

interface StructureEditorProps {
  weekId: string;
}

export default function StructureEditor({ weekId }: StructureEditorProps) {
  const project = useProjectStore((state) => state.project);
  const addDayTemplate = useProjectStore((state) => state.addDayTemplate);
  const renameDayTemplate = useProjectStore((state) => state.renameDayTemplate);
  const removeDayTemplate = useProjectStore((state) => state.removeDayTemplate);
  const moveDayTemplate = useProjectStore((state) => state.moveDayTemplate);
  const addEntry = useProjectStore((state) => state.addEntry);
  const removeEntry = useProjectStore((state) => state.removeEntry);
  const moveEntry = useProjectStore((state) => state.moveEntry);

  const [selectedDayId, setSelectedDayId] = useState<string | undefined>(
    project.dayTemplates[0]?.id,
  );
  const [newDayName, setNewDayName] = useState('');
  const [newExerciseId, setNewExerciseId] = useState(project.exercises[0]?.id ?? '');
  const [pendingDayId, setPendingDayId] = useState<string | null>(null);
  const [pendingRemoval, setPendingRemoval] = useState<{
    entryId: string;
    exerciseName: string;
    scope: 'week' | 'all';
    count: number;
  } | null>(null);

  useEffect(() => {
    if (!project.dayTemplates.some((day) => day.id === selectedDayId)) {
      setSelectedDayId(project.dayTemplates[0]?.id);
    }
  }, [project.dayTemplates, selectedDayId]);

  useEffect(() => {
    if (!project.exercises.some((exercise) => exercise.id === newExerciseId)) {
      setNewExerciseId(project.exercises[0]?.id ?? '');
    }
  }, [project.exercises, newExerciseId]);

  const week = project.weeks.find((item) => item.id === weekId);
  const selectedDay = week?.days.find((day) => day.dayTemplateId === selectedDayId);
  const selectedDayTemplate = project.dayTemplates.find((day) => day.id === selectedDayId);
  const pendingDay = project.dayTemplates.find((day) => day.id === pendingDayId);

  const requestRemoval = (
    entryId: string,
    exerciseId: string,
    exerciseName: string,
    scope: 'week' | 'all',
  ) => {
    const count =
      scope === 'week'
        ? 1
        : project.weeks.reduce((sum, week) => {
            const day = week.days.find((item) => item.dayTemplateId === selectedDayId);
            return (
              sum +
              (day?.entries.filter((entry) => entry.exerciseId === exerciseId).length ?? 0)
            );
          }, 0);
    setPendingRemoval({ entryId, exerciseName, scope, count });
  };

  const addDay = () => {
    const name = newDayName.trim();
    if (!name) return;
    addDayTemplate(name);
    setNewDayName('');
  };

  return (
    <section className="card structure-panel">
      <div className="card-heading">
        <div>
          <p className="eyebrow">Структура</p>
          <h3>Дни и упражнения</h3>
          <p className="muted">
            Названия и порядок дней общие для цикла. Состав упражнений можно менять только в
            этой неделе или сразу во всех.
          </p>
        </div>
      </div>

      <div className="structure-grid">
        <div className="structure-column">
          <h4>Дни недели</h4>
          <div className="structure-list">
            {project.dayTemplates.map((day) => (
              <div
                key={day.id}
                className={`structure-row ${day.id === selectedDayId ? 'is-active' : ''}`}
              >
                <button
                  type="button"
                  className="structure-name"
                  onClick={() => setSelectedDayId(day.id)}
                >
                  {day.name}
                </button>
                <input
                  className="text-input structure-rename"
                  aria-label={`Название дня ${day.name}`}
                  value={day.name}
                  onChange={(event) => renameDayTemplate(day.id, event.target.value)}
                />
                <div className="structure-actions">
                  <button
                    type="button"
                    className="icon-button"
                    aria-label={`День ${day.name} выше`}
                    onClick={() => moveDayTemplate(day.id, -1)}
                  >
                    <ArrowUp size={15} />
                  </button>
                  <button
                    type="button"
                    className="icon-button"
                    aria-label={`День ${day.name} ниже`}
                    onClick={() => moveDayTemplate(day.id, 1)}
                  >
                    <ArrowDown size={15} />
                  </button>
                  <button
                    type="button"
                    className="icon-button"
                    aria-label={`Удалить день ${day.name}`}
                    onClick={() => setPendingDayId(day.id)}
                  >
                    <Trash2 size={15} />
                  </button>
                </div>
              </div>
            ))}
          </div>
          <div className="structure-add">
            <input
              className="text-input"
              aria-label="Название нового дня"
              placeholder="Например, Сб"
              value={newDayName}
              onChange={(event) => setNewDayName(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === 'Enter') addDay();
              }}
            />
            <button type="button" className="button button-ghost" onClick={addDay}>
              <Plus size={15} />
              День
            </button>
          </div>
        </div>

        <div className="structure-column">
          <h4>{selectedDayTemplate?.name ?? 'День'}: упражнения</h4>
          <div className="structure-list">
            {(selectedDay?.entries ?? []).map((entry, index) => {
              const exercise = project.exercises.find((item) => item.id === entry.exerciseId);
              return (
                <div key={entry.id} className="structure-row">
                  <span className="structure-name">{exercise?.name ?? 'Упражнение'}</span>
                  <div className="structure-actions">
                    <button
                      type="button"
                      className="icon-button"
                      aria-label={`${exercise?.name} выше`}
                      onClick={() => moveEntry(weekId, selectedDayId!, entry.id, -1)}
                    >
                      <ArrowUp size={15} />
                    </button>
                    <button
                      type="button"
                      className="icon-button"
                      aria-label={`${exercise?.name} ниже`}
                      onClick={() => moveEntry(weekId, selectedDayId!, entry.id, 1)}
                    >
                      <ArrowDown size={15} />
                    </button>
                    <button
                      type="button"
                      className="icon-button"
                      aria-label={`Убрать ${exercise?.name} из этой недели`}
                      onClick={() =>
                        requestRemoval(
                          entry.id,
                          entry.exerciseId,
                          exercise?.name ?? 'Упражнение',
                          'week',
                        )
                      }
                    >
                      <X size={15} />
                    </button>
                    <button
                      type="button"
                      className="icon-button"
                      aria-label={`Убрать ${exercise?.name} из всех недель`}
                      onClick={() =>
                        requestRemoval(
                          entry.id,
                          entry.exerciseId,
                          exercise?.name ?? 'Упражнение',
                          'all',
                        )
                      }
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>
                  <span className="structure-index">{index + 1}</span>
                </div>
              );
            })}
          </div>
          <div className="structure-add structure-add-wrap">
            <select
              className="select-input"
              aria-label="Упражнение для добавления"
              value={newExerciseId}
              onChange={(event) => setNewExerciseId(event.target.value)}
            >
              {project.exercises.map((exercise) => (
                <option key={exercise.id} value={exercise.id}>
                  {exercise.name}
                </option>
              ))}
            </select>
            <button
              type="button"
              className="button button-ghost"
              onClick={() => addEntry(weekId, selectedDayId!, newExerciseId, 'week')}
            >
              В эту неделю
            </button>
            <button
              type="button"
              className="button button-primary"
              onClick={() => addEntry(weekId, selectedDayId!, newExerciseId, 'all')}
            >
              Во все недели
            </button>
          </div>
        </div>
      </div>

      <ConfirmDialog
        open={pendingRemoval !== null}
        title="Убрать упражнение?"
        message={
          pendingRemoval
            ? `«${pendingRemoval.exerciseName}» будет убрано из ${pendingRemoval.count} строк программы${pendingRemoval.scope === 'all' ? ' во всех неделях' : ' в этой неделе'}.`
            : ''
        }
        confirmLabel="Убрать"
        onCancel={() => setPendingRemoval(null)}
        onConfirm={() => {
          if (pendingRemoval) {
            removeEntry(weekId, selectedDayId!, pendingRemoval.entryId, pendingRemoval.scope);
          }
          setPendingRemoval(null);
        }}
      />

      <ConfirmDialog
        open={pendingDayId !== null}
        title="Удалить день?"
        message={
          pendingDay
            ? `День «${pendingDay.name}» будет удалён из всех недель вместе с упражнениями.`
            : ''
        }
        confirmLabel="Удалить день"
        onCancel={() => setPendingDayId(null)}
        onConfirm={() => {
          if (pendingDayId) removeDayTemplate(pendingDayId);
          setPendingDayId(null);
        }}
      />
    </section>
  );
}
