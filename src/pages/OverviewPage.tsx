import { AlertTriangle, ArrowRight, CircleAlert } from 'lucide-react';
import { useComputedCycle } from '../selectors/useComputedCycle';
import { formatKg, formatMinutes } from '../utils/format';

interface OverviewPageProps {
  onOpenWeek: (weekId: string) => void;
}

function formatNumber(value: number): string {
  return new Intl.NumberFormat('ru-RU', { maximumFractionDigits: 0 }).format(value);
}

export default function OverviewPage({ onOpenWeek }: OverviewPageProps) {
  const { cycle, issues } = useComputedCycle();
  const maxTonnage = Math.max(...cycle.weeks.map((week) => week.tonnage), 1);
  const sessions = cycle.weeks.reduce((sum, week) => sum + week.days.length, 0);
  const errors = issues.filter((issue) => issue.severity === 'error');
  const warnings = issues.filter((issue) => issue.severity === 'warning');

  return (
    <div className="overview">
      <section className="page-heading">
        <div>
          <p className="eyebrow">Сводка</p>
          <h2>Цикл из {cycle.weeks.length} недель</h2>
          <p className="muted">
            Программа пересчитывается автоматически. Измените 1ПМ или схему — итоги обновятся.
          </p>
        </div>
      </section>

      <section className="kpi-grid" aria-label="Ключевые показатели">
        <article className="card kpi">
          <span>Недели</span>
          <strong>{cycle.weeks.length}</strong>
          <small>{sessions} тренировок</small>
        </article>
        <article className="card kpi">
          <span>Тоннаж</span>
          <strong>{formatNumber(cycle.tonnage)} кг</strong>
          <small>средний вес {formatKg(cycle.avgWeight)}</small>
        </article>
        <article className="card kpi">
          <span>КПШ</span>
          <strong>{formatNumber(cycle.kpsh)}</strong>
          <small>подъёмов за цикл</small>
        </article>
        <article className="card kpi">
          <span>Время</span>
          <strong>{formatMinutes(cycle.timeMinutes)}</strong>
          <small>по методу Бондаренко</small>
        </article>
        <article className="card kpi">
          <span>Фунтиков</span>
          <strong>{formatNumber(cycle.funtikov)}</strong>
          <small>интенсивность за цикл</small>
        </article>
      </section>

      <section className="card chart-card">
        <div className="card-heading">
          <div>
            <p className="eyebrow">Нагрузка</p>
            <h3>Тоннаж по неделям</h3>
          </div>
          <span className="badge">кг</span>
        </div>
        <div className="chart" role="img" aria-label="График тоннажа по неделям">
          {cycle.weeks.map((week, index) => (
            <div className="chart-column" key={week.weekId}>
              <span className="chart-value">{formatNumber(week.tonnage)}</span>
              <div
                className="chart-bar"
                style={{ height: `${Math.max(6, (week.tonnage / maxTonnage) * 100)}%` }}
                title={`${week.label}: ${formatNumber(week.tonnage)} кг`}
              />
              <span className="chart-label">{index + 1}</span>
            </div>
          ))}
        </div>
      </section>

      {issues.length > 0 && (
        <section className="card issue-card">
          <div className="card-heading">
            <div>
              <p className="eyebrow">Проверка</p>
              <h3>Замечания</h3>
            </div>
            <span className="badge">
              {errors.length} ошибок · {warnings.length} предупреждений
            </span>
          </div>
          <ul className="issue-list">
            {issues.slice(0, 8).map((issue, index) => (
              <li key={`${issue.code}-${index}`} className={`issue issue-${issue.severity}`}>
                {issue.severity === 'error' ? (
                  <CircleAlert size={16} />
                ) : (
                  <AlertTriangle size={16} />
                )}
                <span>{issue.message}</span>
              </li>
            ))}
          </ul>
          {issues.length > 8 && <p className="muted">И ещё {issues.length - 8} замечаний…</p>}
        </section>
      )}

      <section className="card week-card">
        <div className="card-heading">
          <div>
            <p className="eyebrow">Микроциклы</p>
            <h3>Недели</h3>
          </div>
        </div>
        <div className="week-list">
          {cycle.weeks.map((week) => (
            <button
              type="button"
              className="week-row"
              key={week.weekId}
              onClick={() => onOpenWeek(week.weekId)}
            >
              <span className="week-index">{week.label.replace('Неделя ', '')}</span>
              <span className="week-main">
                <strong>{week.label}</strong>
                <small>
                  {formatNumber(week.tonnage)} кг · {formatNumber(week.kpsh)} КПШ ·{' '}
                  {formatMinutes(week.timeMinutes)}
                </small>
              </span>
              <span className="week-open">
                Открыть
                <ArrowRight size={16} />
              </span>
            </button>
          ))}
        </div>
      </section>
    </div>
  );
}
