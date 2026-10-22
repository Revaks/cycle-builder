import EntryRow from './EntryRow';
import type { ComputedDay } from '../domain/types';
import { formatKg, formatMinutes } from '../utils/format';

interface DayCardProps {
  day: ComputedDay;
  weekId: string;
}

export default function DayCard({ day, weekId }: DayCardProps) {
  return (
    <section className={`card day-card ${day.entries.length === 0 ? 'is-empty' : ''}`}>
      <div className="day-head">
        <div>
          <p className="eyebrow">Тренировка</p>
          <h3>{day.dayName}</h3>
        </div>
        <div className="day-metrics">
          <span>
            <small>Тоннаж</small>
            {Math.round(day.tonnage)} кг
          </span>
          <span>
            <small>КПШ</small>
            {day.kpsh}
          </span>
          <span>
            <small>Время</small>
            {formatMinutes(day.timeMinutes)}
          </span>
          <span>
            <small>Средний вес</small>
            {formatKg(day.avgWeight)}
          </span>
        </div>
      </div>

      <div className="day-entries">
        {day.entries.length === 0 ? (
          <p className="empty-state">В этом дне пока нет упражнений.</p>
        ) : (
          day.entries.map((entry) => (
            <EntryRow
              key={entry.entryId}
              entry={entry}
              weekId={weekId}
              dayTemplateId={day.dayTemplateId}
            />
          ))
        )}
      </div>
    </section>
  );
}
