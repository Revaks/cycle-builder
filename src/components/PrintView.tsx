import type { ComputedCycle, ComputedWeek, Project } from '../domain/types';
import type { ExportScope } from '../export/excel';
import { formatKg, formatMinutes, formatPercent } from '../utils/format';

interface PrintViewProps {
  project: Project;
  cycle: ComputedCycle;
  scope: ExportScope;
}

function selectedWeeks(cycle: ComputedCycle, scope: ExportScope): ComputedWeek[] {
  if (scope.type === 'cycle') return cycle.weeks;
  if (scope.type === 'week') return cycle.weeks.filter((week) => week.weekId === scope.weekId);
  return cycle.weeks.filter((week) => week.weekId === scope.weekId);
}

export default function PrintView({ project, cycle, scope }: PrintViewProps) {
  const weeks = selectedWeeks(cycle, scope);

  return (
    <div className="print-view">
      {weeks.map((week) => {
        const days =
          scope.type === 'day'
            ? week.days.filter((day) => day.dayTemplateId === scope.dayTemplateId)
            : week.days;

        return (
          <section className="print-week" key={week.weekId}>
            <header className="print-header">
              <div>
                <p>{project.name}</p>
                <h2>{week.label}</h2>
              </div>
              <div className="print-meta">
                <span>Тоннаж: {Math.round(week.tonnage)} кг</span>
                <span>КПШ: {week.kpsh}</span>
                <span>Время: {formatMinutes(week.timeMinutes)}</span>
              </div>
            </header>

            {days.map((day) => (
              <section className="print-day" key={day.dayTemplateId}>
                <div className="print-day-head">
                  <h3>{day.dayName}</h3>
                  <span>
                    {Math.round(day.tonnage)} кг · {day.kpsh} КПШ · {formatMinutes(day.timeMinutes)}
                  </span>
                </div>

                {day.entries.length === 0 ? (
                  <p className="print-empty">Отдых</p>
                ) : (
                  <table>
                    <thead>
                      <tr>
                        <th>Упражнение</th>
                        <th>Подходы</th>
                        <th>Повторы</th>
                        <th>%</th>
                        <th>Вес</th>
                      </tr>
                    </thead>
                    <tbody>
                      {day.entries.flatMap((entry) =>
                        entry.groups.length === 0
                          ? [
                              <tr key={`${entry.entryId}-empty`}>
                                <td>{entry.exercise.name}</td>
                                <td>—</td>
                                <td>—</td>
                                <td>—</td>
                                <td>—</td>
                              </tr>,
                            ]
                          : entry.groups.map((group, index) => (
                              <tr key={group.id}>
                                {index === 0 && (
                                  <td rowSpan={entry.groups.length}>{entry.exercise.name}</td>
                                )}
                                <td>{group.sets}</td>
                                <td>{group.reps}</td>
                                <td>{formatPercent(group.percent)}</td>
                                <td>{formatKg(group.weight)}</td>
                              </tr>
                            )),
                      )}
                    </tbody>
                  </table>
                )}

                <div className="print-day-total">
                  <span>Итого за день: {Math.round(day.tonnage)} кг</span>
                  <span>{day.kpsh} КПШ</span>
                  <span>{formatMinutes(day.timeMinutes)}</span>
                </div>
              </section>
            ))}

            <footer className="print-week-total">
              <span>Итого за неделю: {Math.round(week.tonnage)} кг</span>
              <span>{week.kpsh} КПШ</span>
              <span>{formatMinutes(week.timeMinutes)}</span>
            </footer>
          </section>
        );
      })}
    </div>
  );
}
