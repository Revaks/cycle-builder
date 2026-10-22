import { useState } from 'react';
import { Download, RotateCcw, Upload } from 'lucide-react';
import ConfirmDialog from '../components/ConfirmDialog';
import NumberInput from '../components/NumberInput';
import type { Project, RoundingMode } from '../domain/types';
import { validateProject } from '../domain/validation';
import { downloadProjectJson, readProjectJsonFile } from '../export/json';
import { useProjectStore } from '../store/projectStore';

const ROUNDING_OPTIONS: Array<{ value: string; label: string }> = [
  { value: 'auto', label: 'Авто (как в xlsm)' },
  { value: '2.5', label: '2.5 кг' },
  { value: '1', label: '1 кг' },
  { value: '0.5', label: '0.5 кг' },
  { value: '0.25', label: '0.25 кг' },
  { value: '0.1', label: '0.1 кг' },
];

function parseRounding(value: string): RoundingMode {
  return value === 'auto' ? 'auto' : Number(value);
}

export default function SettingsPage() {
  const project = useProjectStore((state) => state.project);
  const renameProject = useProjectStore((state) => state.renameProject);
  const setProgression = useProjectStore((state) => state.setProgression);
  const setDefaultRounding = useProjectStore((state) => state.setDefaultRounding);
  const setMetrics = useProjectStore((state) => state.setMetrics);
  const setProject = useProjectStore((state) => state.setProject);
  const resetToSeed = useProjectStore((state) => state.resetToSeed);
  const [importCandidate, setImportCandidate] = useState<Project | null>(null);
  const [importError, setImportError] = useState<string | null>(null);
  const [importName, setImportName] = useState('');
  const [resetOpen, setResetOpen] = useState(false);

  const issues = validateProject(project);
  const errors = issues.filter((issue) => issue.severity === 'error');

  const updateMetrics = (patch: Partial<typeof project.metrics>) => {
    setMetrics({ ...project.metrics, ...patch });
  };

  const updateFuntikov = (index: number, value: number | null) => {
    const table = [...project.metrics.funtikovTable];
    table[index] = value ?? 0;
    updateMetrics({ funtikovTable: table });
  };

  const updateThreshold = (
    index: number,
    patch: Partial<typeof project.metrics.timeThresholds[number]>,
  ) => {
    updateMetrics({
      timeThresholds: project.metrics.timeThresholds.map((threshold, position) =>
        position === index ? { ...threshold, ...patch } : threshold,
      ),
    });
  };

  const handleImport = async (file: File | undefined) => {
    if (!file) return;
    setImportName(file.name);
    const result = await readProjectJsonFile(file);
    if (result.ok) {
      setImportCandidate(result.project);
      setImportError(null);
    } else {
      setImportCandidate(null);
      setImportError(result.error);
    }
  };

  return (
    <div className="settings-page">
      <section className="page-heading">
        <div>
          <p className="eyebrow">Настройки</p>
          <h2>Параметры цикла</h2>
          <p className="muted">
            Прогрессия, округление и коэффициенты метрик. Изменения сохраняются автоматически.
          </p>
        </div>
      </section>

      <section className="card settings-card">
        <div className="card-heading">
          <div>
            <p className="eyebrow">Проект</p>
            <h3>Название и единицы</h3>
          </div>
        </div>
        <div className="settings-grid">
          <label className="field field-wide">
            <span>Название проекта</span>
            <input
              className="text-input"
              aria-label="Название проекта"
              value={project.name}
              onChange={(event) => renameProject(event.target.value)}
            />
          </label>
          <label className="field">
            <span>Единицы</span>
            <input className="text-input" value="Килограммы" readOnly aria-label="Единицы" />
          </label>
          <label className="field">
            <span>Округление новых упражнений</span>
            <select
              className="select-input"
              aria-label="Округление по умолчанию"
              value={String(project.defaultRounding)}
              onChange={(event) => setDefaultRounding(parseRounding(event.target.value))}
            >
              {ROUNDING_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
        </div>
      </section>

      <section className="card settings-card">
        <div className="card-heading">
          <div>
            <p className="eyebrow">Прогрессия</p>
            <h3>Рост 1ПМ и разгрузки</h3>
          </div>
        </div>
        <div className="settings-grid">
          <label className="field">
            <span>Режим</span>
            <select
              className="select-input"
              aria-label="Режим прогрессии"
              value={project.progression.mode}
              onChange={(event) =>
                setProgression({
                  ...project.progression,
                  mode: event.target.value as typeof project.progression.mode,
                })
              }
            >
              <option value="compound">Сложный процент</option>
              <option value="linear">Линейный</option>
              <option value="none">Без прогрессии</option>
            </select>
          </label>
          <label className="field">
            <span>Шаг за неделю, %</span>
            <NumberInput
              label="Шаг прогрессии"
              value={project.progression.stepPercent}
              min={0}
              max={20}
              step={0.1}
              suffix="%"
              onChange={(value) =>
                setProgression({ ...project.progression, stepPercent: value ?? 0 })
              }
            />
          </label>
          <label className="field">
            <span>Разгрузка</span>
            <select
              className="select-input"
              aria-label="Режим разгрузки"
              value={project.progression.deload.mode}
              onChange={(event) =>
                setProgression({
                  ...project.progression,
                  deload: {
                    ...project.progression.deload,
                    mode: event.target.value as 'hold' | 'reduce',
                  },
                })
              }
            >
              <option value="hold">Держать 1ПМ</option>
              <option value="reduce">Уменьшить 1ПМ</option>
            </select>
          </label>
          <label className="field">
            <span>Уменьшение, %</span>
            <NumberInput
              label="Процент уменьшения на разгрузке"
              value={project.progression.deload.reductionPercent}
              min={0}
              max={100}
              step={1}
              suffix="%"
              onChange={(value) =>
                setProgression({
                  ...project.progression,
                  deload: {
                    ...project.progression.deload,
                    reductionPercent: value ?? 0,
                  },
                })
              }
            />
          </label>
        </div>
      </section>

      <section className="card settings-card">
        <div className="card-heading">
          <div>
            <p className="eyebrow">Метрики</p>
            <h3>Коэффициенты расчёта</h3>
          </div>
          <span className={`badge ${errors.length > 0 ? 'badge-error' : ''}`}>
            {errors.length > 0 ? `${errors.length} ошибок` : 'Ошибок нет'}
          </span>
        </div>

        {errors.length > 0 && (
          <ul className="settings-error-list">
            {errors.slice(0, 6).map((issue, index) => (
              <li key={`${issue.code}-${index}`}>{issue.message}</li>
            ))}
          </ul>
        )}

        <details className="metrics-details">
          <summary>Таблица Фунтикова — 101 значение</summary>
          <p className="muted">
            Коэффициент для каждого целого процента от 0 до 100. Индекс 0 хранится для совместимости и в расчёте не используется.
          </p>
          <div className="funtikov-grid">
            {project.metrics.funtikovTable.map((value, index) => (
              <div className="funtikov-row" key={index}>
                <span>{index}%</span>
                <NumberInput
                  label={`Коэффициент Фунтикова ${index}%`}
                  value={value}
                  min={0}
                  step={0.01}
                  onChange={(next) => updateFuntikov(index, next)}
                />
              </div>
            ))}
          </div>
        </details>

        <div className="settings-subsection">
          <h4>Пороги времени</h4>
          <div className="threshold-table">
            <div className="threshold-head">
              <span>Процент</span>
              <span>Фактор</span>
            </div>
            {project.metrics.timeThresholds.map((threshold, index) => (
              <div className="threshold-row" key={index}>
                <NumberInput
                  label={`Порог времени ${index + 1}, процент`}
                  value={threshold.belowPercent}
                  min={0}
                  max={100}
                  step={1}
                  suffix="%"
                  onChange={(value) => updateThreshold(index, { belowPercent: value ?? 0 })}
                />
                <NumberInput
                  label={`Фактор времени ${index + 1}`}
                  value={threshold.factor}
                  min={0}
                  step={0.1}
                  onChange={(value) => updateThreshold(index, { factor: value ?? 0 })}
                />
              </div>
            ))}
            <div className="threshold-row">
              <span className="muted">иначе</span>
              <NumberInput
                label="Фактор времени по умолчанию"
                value={project.metrics.timeFallbackFactor}
                min={0}
                step={0.1}
                onChange={(value) => updateMetrics({ timeFallbackFactor: value ?? 0 })}
              />
            </div>
          </div>
        </div>

        <div className="settings-subsection">
          <h4>Факторы воздействия</h4>
          <div className="settings-grid">
            <label className="field">
              <span>Тяжёлый порог D</span>
              <NumberInput
                label="Тяжёлый порог D"
                value={project.metrics.impactHeavyThreshold}
                min={0}
                step={0.1}
                onChange={(value) => updateMetrics({ impactHeavyThreshold: value ?? 0 })}
              />
            </label>
            <label className="field">
              <span>Лёгкий порог D</span>
              <NumberInput
                label="Лёгкий порог D"
                value={project.metrics.impactLightThreshold}
                min={0}
                step={0.1}
                onChange={(value) => updateMetrics({ impactLightThreshold: value ?? 0 })}
              />
            </label>
            <label className="field">
              <span>Фактор тяжёлый</span>
              <NumberInput
                label="Фактор тяжёлый"
                value={project.metrics.impactHeavyFactor}
                min={0}
                step={0.5}
                onChange={(value) => updateMetrics({ impactHeavyFactor: value ?? 0 })}
              />
            </label>
            <label className="field">
              <span>Фактор средний</span>
              <NumberInput
                label="Фактор средний"
                value={project.metrics.impactMediumFactor}
                min={0}
                step={0.5}
                onChange={(value) => updateMetrics({ impactMediumFactor: value ?? 0 })}
              />
            </label>
            <label className="field">
              <span>Фактор лёгкий</span>
              <NumberInput
                label="Фактор лёгкий"
                value={project.metrics.impactLightFactor}
                min={0}
                step={0.5}
                onChange={(value) => updateMetrics({ impactLightFactor: value ?? 0 })}
              />
            </label>
          </div>
        </div>
      </section>

      <section className="card settings-card">
        <div className="card-heading">
          <div>
            <p className="eyebrow">Данные</p>
            <h3>Резервная копия</h3>
            <p className="muted">
              JSON содержит упражнения, структуру, схемы и коэффициенты. Импорт заменит текущий
              проект.
            </p>
          </div>
        </div>
        <div className="backup-row">
          <button
            type="button"
            className="button button-ghost"
            onClick={() => downloadProjectJson(project)}
          >
            <Download size={17} />
            Скачать JSON
          </button>
          <label className="button button-ghost file-button">
            <Upload size={17} />
            Импортировать JSON
            <input
              className="file-input"
              type="file"
              accept="application/json,.json"
              aria-label="Импортировать JSON"
              onChange={(event) => {
                void handleImport(event.target.files?.[0]);
                event.target.value = '';
              }}
            />
          </label>
          <button type="button" className="button button-danger" onClick={() => setResetOpen(true)}>
            <RotateCcw size={17} />
            Сбросить к cycle8
          </button>
        </div>
        {importName && <p className="muted">Выбран файл: {importName}</p>}
        {importError && <p className="import-error">{importError}</p>}
      </section>

      <ConfirmDialog
        open={importCandidate !== null}
        title="Импортировать проект?"
        message={
          importCandidate
            ? `Будет загружен проект «${importCandidate.name}»: ${importCandidate.weeks.length} недель, ${importCandidate.exercises.length} упражнений. Текущие данные будут заменены.`
            : ''
        }
        confirmLabel="Импортировать"
        onCancel={() => setImportCandidate(null)}
        onConfirm={() => {
          if (importCandidate) setProject(importCandidate);
          setImportCandidate(null);
        }}
      />

      <ConfirmDialog
        open={resetOpen}
        title="Сбросить к шаблону cycle8?"
        message="Все изменения будут потеряны. Сначала скачайте JSON-копию, если она нужна."
        confirmLabel="Сбросить"
        onCancel={() => setResetOpen(false)}
        onConfirm={() => {
          resetToSeed();
          setResetOpen(false);
        }}
      />
    </div>
  );
}
