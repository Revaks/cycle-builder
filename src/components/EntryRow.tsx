import { useState } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import ConfirmDialog from './ConfirmDialog';
import GroupEditor from './GroupEditor';
import type { ComputedEntry, ComputedGroup, Issue } from '../domain/types';
import { useProjectStore } from '../store/projectStore';
import { formatKg, formatMinutes, formatPercent } from '../utils/format';

interface EntryRowProps {
  entry: ComputedEntry;
  weekId: string;
  dayTemplateId: string;
  issues: Issue[];
}

export default function EntryRow({ entry, weekId, dayTemplateId, issues }: EntryRowProps) {
  const addGroup = useProjectStore((state) => state.addGroup);
  const updateGroup = useProjectStore((state) => state.updateGroup);
  const removeGroup = useProjectStore((state) => state.removeGroup);
  const removeEntry = useProjectStore((state) => state.removeEntry);
  const [openGroupId, setOpenGroupId] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const openGroup = entry.groups.find((group) => group.id === openGroupId);
  const entryIssues = issues.filter((issue) => issue.entryId === entry.entryId);

  return (
    <article className={`entry-row ${entry.hasMissingOneRM ? 'has-warning' : ''}`}>
      <div className="entry-main">
        <div className="entry-title">
          <strong>{entry.exercise.name}</strong>
          <span>1ПМ {formatKg(entry.oneRM)}</span>
          {entry.hasMissingOneRM && <span className="mini-badge">нет 1ПМ</span>}
          {entryIssues.length > 0 && (
            <span
              className="mini-badge mini-badge-error"
              aria-label={`Ошибок в строке: ${entryIssues.length}`}
              title={entryIssues.map((issue) => issue.message).join('\n')}
            >
              {entryIssues.length}
            </span>
          )}
        </div>
        <div className="entry-groups">
          {entry.groups.map((group, index) => (
            <button
              type="button"
              key={group.id}
              className={`group-pill ${openGroupId === group.id ? 'is-open' : ''}`}
              aria-label={`Группа ${index + 1} упражнения ${entry.exercise.name}`}
              onClick={() => setOpenGroupId(openGroupId === group.id ? null : group.id)}
            >
              <span>
                {group.sets}×{group.reps} @ {formatPercent(group.percent)}
              </span>
              <strong>{formatKg(group.weight)}</strong>
            </button>
          ))}
          <button
            type="button"
            className="add-group-button"
            aria-label={`Добавить группу ${entry.exercise.name}`}
            onClick={() => addGroup(weekId, dayTemplateId, entry.entryId)}
          >
            <Plus size={15} />
            Группа
          </button>
        </div>
      </div>

      <div className="entry-metrics">
        <span>
          <small>Тоннаж</small>
          {entry.hasMissingOneRM ? '—' : `${Math.round(entry.tonnage)} кг`}
        </span>
        <span>
          <small>КПШ</small>
          {entry.kpsh}
        </span>
        <span>
          <small>Время</small>
          {formatMinutes(Math.round(entry.timeMinutes * 10) / 10)}
        </span>
      </div>

      <button
        type="button"
        className="icon-button"
        aria-label={`Удалить упражнение ${entry.exercise.name}`}
        onClick={() => setConfirmDelete(true)}
      >
        <Trash2 size={17} />
      </button>

      {openGroup && (
        <GroupEditor
          group={openGroup as ComputedGroup}
          index={entry.groups.findIndex((group) => group.id === openGroup.id)}
          onUpdate={(patch) =>
            updateGroup(weekId, dayTemplateId, entry.entryId, openGroup.id, patch)
          }
          onRemove={() => {
            removeGroup(weekId, dayTemplateId, entry.entryId, openGroup.id);
            setOpenGroupId(null);
          }}
        />
      )}

      <ConfirmDialog
        open={confirmDelete}
        title="Удалить упражнение из дня?"
        message={`«${entry.exercise.name}» будет удалено из этой недели.`}
        confirmLabel="Удалить"
        onCancel={() => setConfirmDelete(false)}
        onConfirm={() => {
          removeEntry(weekId, dayTemplateId, entry.entryId, 'week');
          setConfirmDelete(false);
        }}
      />
    </article>
  );
}
