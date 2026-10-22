import { useEffect, useMemo, useState } from 'react';
import { FileDown, Printer } from 'lucide-react';
import PrintView from '../components/PrintView';
import { downloadExcel, type ExportScope } from '../export/excel';
import { useComputedCycle } from '../selectors/useComputedCycle';
import { useProjectStore } from '../store/projectStore';
import { formatKg, formatMinutes } from '../utils/format';

type ScopeType = 'cycle' | 'week' | 'day';

export default function ExportPage() {
  const project = useProjectStore((state) => state.project);
  const { cycle, issues } = useComputedCycle();
  const [scopeType, setScopeType] = useState<ScopeType>('cycle');
  const [weekId, setWeekId] = useState(cycle.weeks[0]?.weekId ?? '');
  const [dayTemplateId, setDayTemplateId] = useState(cycle.weeks[0]?.days[0]?.dayTemplateId ?? '');
  const [exporting, setExporting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [printPending, setPrintPending] = useState(false);

  useEffect(() => {
    if (!printPending) return;
    const timer = window.setTimeout(() => {
      window.print();
      setPrintPending(false);
    }, 80);
    return () => window.clearTimeout(timer);
  }, [printPending]);

  const errors = issues.filter((issue) => issue.severity === 'error');
  const warnings = issues.filter((issue) => issue.severity === 'warning');

  const selectedWeek = cycle.weeks.find((week) => week.weekId === weekId) ?? cycle.weeks[0];
  const selectedDay =
    selectedWeek?.days.find((day) => day.dayTemplateId === dayTemplateId) ?? selectedWeek?.days[0];

  const scope: ExportScope = useMemo(() => {
    if (scopeType === 'week' && selectedWeek) return { type: 'week', weekId: selectedWeek.weekId };
    if (scopeType === 'day' && selectedWeek && selectedDay) {
      return {
        type: 'day',
        weekId: selectedWeek.weekId,
        dayTemplateId: selectedDay.dayTemplateId,
      };
    }
    return { type: 'cycle' };
  }, [scopeType, selectedWeek, selectedDay]);

  const preview =
    scope.type === 'cycle'
      ? {
          title: 'Весь цикл',
          detail: `${cycle.weeks.length} недель · ${formatKg(cycle.tonnage)} тоннаж`,
        }
      : scope.type === 'week' && selectedWeek
        ? {
            title: selectedWeek.label,
            detail: `${selectedWeek.days.length} тренировок · ${formatKg(selectedWeek.tonnage)} тоннаж`,
          }
        : selectedDay
          ? {
              title: `${selectedWeek?.label}: ${selectedDay.dayName}`,
              detail: `${selectedDay.entries.length} упражнений · ${formatMinutes(selectedDay.timeMinutes)}`,
            }
          : { title: 'Не выбрано', detail: '' };

  const handleExcel = async () => {
    if (errors.length > 0) return;
    setExporting(true);
    setError(null);
    try {
      await downloadExcel(project, cycle, scope);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Не удалось сформировать Excel');
    } finally {
      setExporting(false);
    }
  };

  const handlePrint = () => {
    if (errors.length > 0) return;
    setPreviewOpen(true);
    setPrintPending(true);
  };

  return (
    <div className="export-page">
      <section className="page-heading">
        <div>
          <p className="eyebrow">Экспорт</p>
          <h2>Печать и Excel</h2>
          <p className="muted">
            Выгрузите весь цикл, одну неделю или отдельную тренировку. Excel содержит сводку и
            листы недель.
          </p>
        </div>
      </section>

      {errors.length > 0 && (
        <section className="card export-errors">
          <h3>Экспорт заблокирован</h3>
          <p className="muted">Исправьте ошибки в программе, чтобы сформировать файл.</p>
          <ul>
            {errors.slice(0, 5).map((issue, index) => (
              <li key={`${issue.code}-${index}`}>{issue.message}</li>
            ))}
          </ul>
        </section>
      )}

      <section className="card export-card">
        <div className="card-heading">
          <div>
            <p className="eyebrow">Область</p>
            <h3>Что выгружаем</h3>
          </div>
          <span className="badge">{warnings.length} предупреждений</span>
        </div>

        <div className="export-controls">
          <label className="field">
            <span>Область</span>
            <select
              className="select-input"
              aria-label="Область экспорта"
              value={scopeType}
              onChange={(event) => setScopeType(event.target.value as ScopeType)}
            >
              <option value="cycle">Весь цикл</option>
              <option value="week">Одна неделя</option>
              <option value="day">Одна тренировка</option>
            </select>
          </label>

          {(scopeType === 'week' || scopeType === 'day') && (
            <label className="field">
              <span>Неделя</span>
              <select
                className="select-input"
                aria-label="Неделя для экспорта"
                value={selectedWeek?.weekId ?? ''}
                onChange={(event) => {
                  const next = cycle.weeks.find((week) => week.weekId === event.target.value);
                  setWeekId(event.target.value);
                  if (next?.days[0]) setDayTemplateId(next.days[0].dayTemplateId);
                }}
              >
                {cycle.weeks.map((week) => (
                  <option key={week.weekId} value={week.weekId}>
                    {week.label}
                  </option>
                ))}
              </select>
            </label>
          )}

          {scopeType === 'day' && selectedWeek && (
            <label className="field">
              <span>Тренировка</span>
              <select
                className="select-input"
                aria-label="Тренировка для экспорта"
                value={selectedDay?.dayTemplateId ?? ''}
                onChange={(event) => setDayTemplateId(event.target.value)}
              >
                {selectedWeek.days.map((day) => (
                  <option key={day.dayTemplateId} value={day.dayTemplateId}>
                    {day.dayName}
                  </option>
                ))}
              </select>
            </label>
          )}
        </div>

        <div className="export-summary">
          <span className="eyebrow">Выбрано</span>
          <strong>{preview.title}</strong>
          <span className="muted">{preview.detail}</span>
        </div>

        <div className="export-actions">
          <button
            type="button"
            className="button button-primary"
            onClick={() => void handleExcel()}
            disabled={errors.length > 0 || exporting}
          >
            <FileDown size={17} />
            {exporting ? 'Готовим файл…' : 'Скачать Excel'}
          </button>
          <button
            type="button"
            className="button button-ghost"
            onClick={handlePrint}
            disabled={errors.length > 0}
          >
            <Printer size={17} />
            Печать / PDF
          </button>
          <button
            type="button"
            className="button button-ghost"
            onClick={() => setPreviewOpen((open) => !open)}
            disabled={errors.length > 0}
          >
            {previewOpen ? 'Скрыть предпросмотр' : 'Предпросмотр'}
          </button>
        </div>

        {error && <p className="import-error">{error}</p>}
      </section>

      {previewOpen && (
        <section className="print-preview-shell">
          <div className="print-preview-head">
            <h3>Предпросмотр печати</h3>
            <button
              type="button"
              className="text-button"
              onClick={() => setPreviewOpen(false)}
            >
              Скрыть
            </button>
          </div>
          <PrintView project={project} cycle={cycle} scope={scope} />
        </section>
      )}

      <section className="card export-hint">
        <h3>Что внутри Excel</h3>
        <p className="muted">
          Лист «Сводка» с тоннажем, КПШ, временем и Фунтиковым. Листы недель — по одной строке на
          группу подхода, с итогами дня и недели.
        </p>
      </section>
    </div>
  );
}
