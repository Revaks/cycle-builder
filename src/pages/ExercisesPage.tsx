import { useMemo, useState } from 'react';
import { Plus, Search, Trash2 } from 'lucide-react';
import ConfirmDialog from '../components/ConfirmDialog';
import NumberInput from '../components/NumberInput';
import type { Exercise, RoundingMode } from '../domain/types';
import { useProjectStore } from '../store/projectStore';
import { formatKg } from '../utils/format';

const ROUNDING_OPTIONS: Array<{ value: string; label: string }> = [
  { value: 'auto', label: 'Авто' },
  { value: '2.5', label: '2.5 кг' },
  { value: '1', label: '1 кг' },
  { value: '0.5', label: '0.5 кг' },
  { value: '0.25', label: '0.25 кг' },
  { value: '0.1', label: '0.1 кг' },
];

function parseRounding(value: string): RoundingMode {
  return value === 'auto' ? 'auto' : Number(value);
}

interface Draft {
  name: string;
  oneRM: number | null;
  impact: number;
  multiplier: number;
  rounding: RoundingMode;
}

const EMPTY_DRAFT: Draft = {
  name: '',
  oneRM: null,
  impact: 1,
  multiplier: 1,
  rounding: 'auto',
};

export default function ExercisesPage() {
  const project = useProjectStore((state) => state.project);
  const addExercise = useProjectStore((state) => state.addExercise);
  const updateExercise = useProjectStore((state) => state.updateExercise);
  const removeExercise = useProjectStore((state) => state.removeExercise);
  const [query, setQuery] = useState('');
  const [draft, setDraft] = useState<Draft>(EMPTY_DRAFT);
  const [pendingDelete, setPendingDelete] = useState<Exercise | null>(null);

  const usageById = useMemo(() => {
    const usage = new Map<string, number>();
    for (const week of project.weeks) {
      for (const day of week.days) {
        for (const entry of day.entries) {
          usage.set(entry.exerciseId, (usage.get(entry.exerciseId) ?? 0) + 1);
        }
      }
    }
    return usage;
  }, [project.weeks]);

  const filtered = project.exercises.filter((exercise) =>
    exercise.name.toLowerCase().includes(query.trim().toLowerCase()),
  );

  const submitDraft = () => {
    if (!draft.name.trim()) return;
    addExercise({
      name: draft.name.trim(),
      oneRM: draft.oneRM,
      impact: draft.impact,
      multiplier: draft.multiplier,
      rounding: draft.rounding,
    });
    setDraft(EMPTY_DRAFT);
  };

  const pendingUsage = pendingDelete ? (usageById.get(pendingDelete.id) ?? 0) : 0;

  return (
    <div className="exercises-page">
      <section className="page-heading">
        <div>
          <p className="eyebrow">Справочник</p>
          <h2>Упражнения и 1ПМ</h2>
          <p className="muted">
            Рабочий вес считается как 1ПМ × процент и округляется по шагу. D — коэффициент
            воздействия, E — множитель для гантелей и блока.
          </p>
        </div>
      </section>

      <section className="card add-card">
        <div className="card-heading">
          <div>
            <p className="eyebrow">Новое упражнение</p>
            <h3>Добавить в справочник</h3>
          </div>
          <span className="badge">{formatKg(draft.oneRM)}</span>
        </div>
        <div className="add-form">
          <label className="field field-wide">
            <span>Название</span>
            <input
              className="text-input"
              aria-label="Название нового упражнения"
              value={draft.name}
              onChange={(event) => setDraft({ ...draft, name: event.target.value })}
              placeholder="Например, Жим гантелей лёжа"
            />
          </label>
          <label className="field">
            <span>1ПМ</span>
            <NumberInput
              label="1ПМ нового упражнения"
              value={draft.oneRM}
              onChange={(value) => setDraft({ ...draft, oneRM: value })}
              min={0}
              step={0.5}
              suffix="кг"
            />
          </label>
          <label className="field">
            <span>D</span>
            <NumberInput
              label="D нового упражнения"
              value={draft.impact}
              onChange={(value) => setDraft({ ...draft, impact: value ?? 1 })}
              min={0.1}
              step={0.1}
            />
          </label>
          <label className="field">
            <span>E</span>
            <NumberInput
              label="E нового упражнения"
              value={draft.multiplier}
              onChange={(value) => setDraft({ ...draft, multiplier: value ?? 1 })}
              min={0.1}
              step={0.5}
            />
          </label>
          <label className="field">
            <span>Округление</span>
            <select
              className="select-input"
              aria-label="Округление нового упражнения"
              value={String(draft.rounding)}
              onChange={(event) =>
                setDraft({ ...draft, rounding: parseRounding(event.target.value) })
              }
            >
              {ROUNDING_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
          <button type="button" className="button button-primary add-button" onClick={submitDraft}>
            <Plus size={17} />
            Добавить
          </button>
        </div>
      </section>

      <section className="card table-card">
        <div className="card-heading">
          <div>
            <p className="eyebrow">Всего {project.exercises.length}</p>
            <h3>Список упражнений</h3>
          </div>
          <label className="search-field">
            <Search size={16} />
            <input
              className="search-input"
              aria-label="Поиск упражнений"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Поиск по названию"
            />
          </label>
        </div>

        <div className="table-wrap">
          <table className="data-table exercises-table">
            <thead>
              <tr>
                <th>Упражнение</th>
                <th>1ПМ</th>
                <th>D</th>
                <th>E</th>
                <th>Округление</th>
                <th>Использований</th>
                <th aria-label="Действия" />
              </tr>
            </thead>
            <tbody>
              {filtered.map((exercise) => (
                <tr key={exercise.id}>
                  <td>
                    <input
                      className="text-input name-input"
                      aria-label={`Название ${exercise.name}`}
                      value={exercise.name}
                      onChange={(event) =>
                        updateExercise(exercise.id, { name: event.target.value })
                      }
                    />
                  </td>
                  <td>
                    <NumberInput
                      label={`1ПМ ${exercise.name}`}
                      value={exercise.oneRM}
                      onChange={(value) => updateExercise(exercise.id, { oneRM: value })}
                      min={0}
                      step={0.5}
                      suffix="кг"
                    />
                  </td>
                  <td>
                    <NumberInput
                      label={`D ${exercise.name}`}
                      value={exercise.impact}
                      onChange={(value) =>
                        updateExercise(exercise.id, { impact: value ?? exercise.impact })
                      }
                      min={0.1}
                      step={0.1}
                    />
                  </td>
                  <td>
                    <NumberInput
                      label={`E ${exercise.name}`}
                      value={exercise.multiplier}
                      onChange={(value) =>
                        updateExercise(exercise.id, { multiplier: value ?? exercise.multiplier })
                      }
                      min={0.1}
                      step={0.5}
                    />
                  </td>
                  <td>
                    <select
                      className="select-input"
                      aria-label={`Округление ${exercise.name}`}
                      value={String(exercise.rounding)}
                      onChange={(event) =>
                        updateExercise(exercise.id, {
                          rounding: parseRounding(event.target.value),
                        })
                      }
                    >
                      {ROUNDING_OPTIONS.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td>
                    <span className="usage-count">{usageById.get(exercise.id) ?? 0}</span>
                  </td>
                  <td>
                    <button
                      type="button"
                      className="icon-button"
                      aria-label={`Удалить ${exercise.name}`}
                      onClick={() => setPendingDelete(exercise)}
                    >
                      <Trash2 size={17} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {filtered.length === 0 && (
            <p className="empty-state">Ничего не найдено. Измените запрос или добавьте упражнение.</p>
          )}
        </div>
      </section>

      <ConfirmDialog
        open={pendingDelete !== null}
        title="Удалить упражнение?"
        message={
          pendingDelete
            ? `«${pendingDelete.name}» будет удалено из справочника и из ${pendingUsage} строк программы.`
            : ''
        }
        confirmLabel="Удалить упражнение"
        onCancel={() => setPendingDelete(null)}
        onConfirm={() => {
          if (pendingDelete) removeExercise(pendingDelete.id);
          setPendingDelete(null);
        }}
      />
    </div>
  );
}
