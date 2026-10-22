import { Copy, Plus, Trash2 } from 'lucide-react';
import type { ComputedWeek } from '../domain/types';

interface WeekTabsProps {
  weeks: ComputedWeek[];
  selectedId: string | undefined;
  onSelect: (weekId: string) => void;
  onAdd: () => void;
  onDuplicate: () => void;
  onDelete: () => void;
}

export default function WeekTabs({
  weeks,
  selectedId,
  onSelect,
  onAdd,
  onDuplicate,
  onDelete,
}: WeekTabsProps) {
  return (
    <div className="week-toolbar">
      <div className="week-tabs" role="tablist" aria-label="Недели цикла">
        {weeks.map((week, index) => (
          <button
            type="button"
            key={week.weekId}
            role="tab"
            aria-selected={selectedId === week.weekId}
            className={`week-tab ${selectedId === week.weekId ? 'is-active' : ''}`}
            onClick={() => onSelect(week.weekId)}
          >
            <span className="week-tab-number">{index + 1}</span>
            <span>{week.label}</span>
            {week.isDeload && <span className="week-tab-badge">разгрузка</span>}
          </button>
        ))}
      </div>
      <div className="week-actions">
        <button type="button" className="button button-ghost" onClick={onAdd}>
          <Plus size={16} />
          Неделя
        </button>
        <button
          type="button"
          className="icon-button"
          aria-label="Дублировать неделю"
          onClick={onDuplicate}
          disabled={!selectedId}
        >
          <Copy size={17} />
        </button>
        <button
          type="button"
          className="icon-button"
          aria-label="Удалить неделю"
          onClick={onDelete}
          disabled={!selectedId}
        >
          <Trash2 size={17} />
        </button>
      </div>
    </div>
  );
}
