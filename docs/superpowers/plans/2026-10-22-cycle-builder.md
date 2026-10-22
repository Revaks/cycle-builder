# Конструктор цикла тренировок — план реализации

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Собрать локальное веб-приложение, которое загружает цикл из `cycle8.xlsm`, позволяет редактировать упражнения, структуру, схемы, прогрессию и коэффициенты, мгновенно пересчитывает веса и метрики, печатает программу и выгружает Excel/JSON.

**Architecture:** React + TypeScript SPA без сервера. Чистый доменный слой (`src/domain`) отвечает за все формулы; Zustand хранит проект и автосохраняет его в `localStorage`; селектор считает `ComputedCycle`; страницы только отображают и редактируют данные. Шаблон `cycle8` генерируется из xlsm один раз и лежит в `src/data/cycle8.seed.json`.

**Tech Stack:** React 19, TypeScript, Vite, Zustand, ExcelJS, Lucide React, Vitest, Testing Library, jsdom.

**Spec:** `docs/superpowers/specs/2026-10-22-cycle-builder-design.md`

## Global Constraints

- Интерфейс на русском, единицы — килограммы.
- Один проект / один атлет; без сервера и аккаунтов.
- Шаблон: 12 недель × 3 дня × 6 упражнений, 18 уникальных упражнений, прогрессия 1% compound.
- Все расчёты — только в `src/domain`; в компонентах формул нет.
- `percent` хранится в диапазоне 0–100, не 0–1.
- `MROUND` округляет половину от нуля.
- Время дня: `0`, если сумма упражнений 0, иначе `floor(сумма + 30)` минут.
- Ключ автосохранения: `cycle-builder.project.v1`.
- Печать: A4, одна неделя на страницу.
- Excel: листы «Сводка» и «Неделя 1…N».
- JSON: полный `Project` с `schemaVersion: 1`.
- После каждой задачи — отдельный коммит.

## Review Focus

Эти случаи не покрываются «счастливым путём» и чаще всего ломают приложение:

1. **Не задан 1ПМ.** Вес и weight-метрики должны стать `—`, КПШ и время — сохраниться; приложение не падает. Тест в Task 4.
2. **Границы Фунтикова 35/40/45/50% и нецелый процент выше 50.** Должны выбираться коэффициенты `table[38]`, `table[43]`, `table[48]`, `table[50]`, а `50.5%` — `table[50]`, не 0. Тест в Task 3.
3. **Разгрузка на первой неделе и обычная неделя после разгрузки.** Тренд после разгрузки не должен «проседать» навсегда. Тест в Task 3.
4. **Пустой день и день с нулевым временем.** Время дня должно быть 0 без добавки 30 минут; непустой день — `floor(сумма + 30)`. Тест в Task 4.
5. **Импорт JSON с чужой/старой версией и битой ссылкой.** Импорт должен отклоняться с понятной ошибкой, не заменяя проект. Тест в Task 5.

---

### Task 1: Каркас приложения и округление

**Files:**
- Create: `package.json`, `vite.config.ts`, `tsconfig.json`, `tsconfig.node.json`, `index.html`
- Create: `src/main.tsx`, `src/App.tsx`, `src/styles/app.css`
- Create: `src/domain/rounding.ts`
- Create: `tests/domain/rounding.test.ts`
- Create: `.gitignore`

**Interfaces:**
- Produces: `mround(value: number, step: number): number`
- Produces: `autoStep(oneRM: number): number`
- Produces: `resolveStep(oneRM: number, rounding: RoundingMode): number`

- [ ] **Step 1: Написать падающий тест округления**

```ts
// tests/domain/rounding.test.ts
import { describe, expect, it } from 'vitest';
import { autoStep, mround, resolveStep } from '../../src/domain/rounding';

describe('mround', () => {
  it('округляет половину от нуля', () => {
    expect(mround(32.4, 2.5)).toBe(32.5);
    expect(mround(32.49, 2.5)).toBe(32.5);
    expect(mround(11.25, 2.5)).toBe(12.5);
    expect(mround(-11.25, 2.5)).toBe(-12.5);
  });

  it('убирает floating point мусор', () => {
    expect(mround(1.234, 0.1)).toBe(1.2);
    expect(mround(42.5 * 0.48, 2.5)).toBe(20);
  });
});

describe('autoStep', () => {
  it('повторяет правило xlsm', () => {
    expect(autoStep(50)).toBe(1);
    expect(autoStep(50.1)).toBe(2.5);
    expect(autoStep(15)).toBe(1);
    expect(autoStep(14.9)).toBe(0.1);
  });
});

describe('resolveStep', () => {
  it('использует переопределение упражнения', () => {
    expect(resolveStep(90, 'auto')).toBe(2.5);
    expect(resolveStep(90, 0.5)).toBe(0.5);
  });
});
```

- [ ] **Step 2: Запустить тест и убедиться, что он падает**

Run: `npm test -- tests/domain/rounding.test.ts`
Expected: FAIL — модуль `rounding` не найден.

- [ ] **Step 3: Создать `package.json` и конфигурацию**

`package.json`:

```json
{
  "name": "cycle-builder",
  "private": true,
  "version": "0.1.0",
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "tsc --noEmit && vite build",
    "test": "vitest run",
    "test:watch": "vitest",
    "preview": "vite preview"
  },
  "dependencies": {
    "exceljs": "^4.4.0",
    "lucide-react": "^0.468.0",
    "react": "^19.0.0",
    "react-dom": "^19.0.0",
    "zustand": "^5.0.2"
  },
  "devDependencies": {
    "@testing-library/react": "^16.1.0",
    "@testing-library/user-event": "^14.5.2",
    "@types/react": "^19.0.3",
    "@types/react-dom": "^19.0.2",
    "@vitejs/plugin-react": "^4.3.4",
    "jsdom": "^25.0.1",
    "typescript": "^5.7.2",
    "vite": "^6.0.5",
    "vitest": "^2.1.8"
  }
}
```

`vite.config.ts`:

```ts
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    globals: true,
  },
});
```

`tsconfig.json`:

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "useDefineForClassFields": true,
    "lib": ["ES2022", "DOM", "DOM.Iterable"],
    "module": "ESNext",
    "skipLibCheck": true,
    "moduleResolution": "Bundler",
    "allowImportingTsExtensions": false,
    "resolveJsonModule": true,
    "isolatedModules": true,
    "noEmit": true,
    "jsx": "react-jsx",
    "strict": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noFallthroughCasesInSwitch": true
  },
  "include": ["src", "tests", "vite.config.ts"]
}
```

`tsconfig.node.json`:

```json
{
  "compilerOptions": {
    "composite": true,
    "skipLibCheck": true,
    "module": "ESNext",
    "moduleResolution": "Bundler",
    "allowSyntheticDefaultImports": true
  },
  "include": ["vite.config.ts"]
}
```

`index.html`:

```html
<!doctype html>
<html lang="ru">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Конструктор цикла</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>
```

`.gitignore`:

```text
node_modules/
dist/
.venv/
*.local
.DS_Store
```

- [ ] **Step 4: Создать минимальный каркас и реализовать округление**

`src/domain/rounding.ts`:

```ts
import type { RoundingMode } from './types';

export function mround(value: number, step: number): number {
  if (!Number.isFinite(step) || step <= 0) {
    throw new Error('Шаг округления должен быть больше нуля');
  }
  const quotient = value / step;
  const rounded =
    quotient >= 0
      ? Math.floor(quotient + 0.5 + 1e-9)
      : Math.ceil(quotient - 0.5 - 1e-9);
  return Number((rounded * step).toFixed(6));
}

export function autoStep(oneRM: number): number {
  if (oneRM > 50) return 2.5;
  if (oneRM < 15) return 0.1;
  return 1;
}

export function resolveStep(oneRM: number, rounding: RoundingMode): number {
  return rounding === 'auto' ? autoStep(oneRM) : rounding;
}
```

Создать `src/domain/types.ts` с типом `RoundingMode` и остальными типами из Task 2. На этом шаге достаточно `export type RoundingMode = 'auto' | number;`, остальные типы добавит Task 2.

`src/main.tsx`:

```tsx
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import './styles/app.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
```

`src/App.tsx`:

```tsx
export default function App() {
  return <main className="app">Конструктор цикла</main>;
}
```

`src/styles/app.css`: базовые CSS-переменные, сброс, системный шрифт, светлый фон.

- [ ] **Step 5: Запустить тест и сборку**

Run: `npm test -- tests/domain/rounding.test.ts`
Expected: PASS, 3 файла/теста зелёные.

Run: `npm run build`
Expected: успешная сборка, `dist/` создан.

- [ ] **Step 6: Закоммитить**

```bash
git add package.json package-lock.json vite.config.ts tsconfig.json tsconfig.node.json index.html .gitignore src tests
git commit -m "feat: scaffold app and add rounding engine"
```

---

### Task 2: Типы, генерация шаблона cycle8 и эталоны

**Files:**
- Create: `src/domain/types.ts` (полная модель)
- Create: `src/domain/seed.ts`
- Create: `src/data/cycle8.seed.json` (генерируется)
- Create: `tests/fixtures/cycle8.expected.json` (генерируется)
- Create: `scripts/extract_cycle8.py`
- Create: `tests/domain/seed.test.ts`

**Interfaces:**
- Consumes: `RoundingMode` из Task 1.
- Produces: все типы `Project`, `Exercise`, `DayTemplate`, `Week`, `WeekDay`, `Entry`, `SetGroup`, `ProgressionConfig`, `MetricsConfig`, `TimeThreshold`.
- Produces: `createSeedProject(): Project` — возвращает глубокую копию шаблона.

- [ ] **Step 1: Написать падающий тест шаблона**

```ts
// tests/domain/seed.test.ts
import { describe, expect, it } from 'vitest';
import { createSeedProject } from '../../src/domain/seed';

describe('cycle8 seed', () => {
  it('содержит полный цикл', () => {
    const project = createSeedProject();
    expect(project.schemaVersion).toBe(1);
    expect(project.exercises).toHaveLength(18);
    expect(project.dayTemplates.map((d) => d.name)).toEqual(['Пн', 'Ср', 'Пт']);
    expect(project.weeks).toHaveLength(12);
    for (const week of project.weeks) {
      expect(week.days).toHaveLength(3);
      for (const day of week.days) expect(day.entries).toHaveLength(6);
    }
  });

  it('сохраняет исходные параметры', () => {
    const project = createSeedProject();
    const press = project.exercises.find((e) => e.name === 'Жим стоя')!;
    expect(press.oneRM).toBe(90);
    expect(press.impact).toBe(1);
    expect(press.multiplier).toBe(1);
    expect(project.progression).toEqual({
      mode: 'compound',
      stepPercent: 1,
      deload: { mode: 'hold', reductionPercent: 10 },
    });
    expect(project.metrics.funtikovTable).toHaveLength(101);
    expect(project.metrics.funtikovTable[100]).toBe(25);
  });

  it('сохраняет схему первой строки', () => {
    const project = createSeedProject();
    const monday = project.weeks[0].days[0];
    const press = monday.entries[0];
    expect(press.groups.map((g) => g.percent)).toEqual([35, 48, 55]);
    expect(press.groups.map((g) => g.reps)).toEqual([12, 10, 8]);
    expect(press.groups.map((g) => g.sets)).toEqual([1, 2, 2]);
  });

  it('создаёт независимую копию', () => {
    const a = createSeedProject();
    const b = createSeedProject();
    a.exercises[0].oneRM = 1;
    expect(b.exercises[0].oneRM).toBe(90);
  });
});
```

- [ ] **Step 2: Запустить тест и убедиться, что он падает**

Run: `npm test -- tests/domain/seed.test.ts`
Expected: FAIL — `createSeedProject` не найден.

- [ ] **Step 3: Описать полную модель в `src/domain/types.ts`**

```ts
export type Unit = 'kg';
export type RoundingMode = 'auto' | number;

export interface Exercise {
  id: string;
  name: string;
  oneRM: number | null;
  impact: number;
  multiplier: number;
  rounding: RoundingMode;
  note?: string;
}

export interface DayTemplate {
  id: string;
  name: string;
}

export interface SetGroup {
  id: string;
  percent: number;
  reps: number;
  sets: number;
}

export interface Entry {
  id: string;
  exerciseId: string;
  groups: SetGroup[];
}

export interface WeekDay {
  dayTemplateId: string;
  entries: Entry[];
}

export interface Week {
  id: string;
  label: string;
  isDeload: boolean;
  days: WeekDay[];
}

export interface ProgressionConfig {
  mode: 'compound' | 'linear' | 'none';
  stepPercent: number;
  deload: {
    mode: 'hold' | 'reduce';
    reductionPercent: number;
  };
}

export interface TimeThreshold {
  belowPercent: number;
  factor: number;
}

export interface MetricsConfig {
  funtikovTable: number[];
  timeThresholds: TimeThreshold[];
  timeFallbackFactor: number;
  impactHeavyThreshold: number;
  impactLightThreshold: number;
  impactHeavyFactor: number;
  impactMediumFactor: number;
  impactLightFactor: number;
}

export interface Project {
  schemaVersion: 1;
  id: string;
  name: string;
  createdAt: string;
  updatedAt: string;
  unit: Unit;
  defaultRounding: RoundingMode;
  exercises: Exercise[];
  dayTemplates: DayTemplate[];
  weeks: Week[];
  progression: ProgressionConfig;
  metrics: MetricsConfig;
}

export interface ComputedGroup extends SetGroup {
  weight: number | null;
  tonnage: number | null;
  kpsh: number;
  funtikov: number | null;
  timeMinutes: number;
}

export interface ComputedEntry {
  entryId: string;
  exercise: Exercise;
  oneRM: number | null;
  groups: ComputedGroup[];
  tonnage: number;
  kpsh: number;
  funtikov: number;
  timeMinutes: number;
  avgWeight: number;
  relativeIntensity: number | null;
  hasMissingOneRM: boolean;
}

export interface ComputedDay {
  dayTemplateId: string;
  dayName: string;
  entries: ComputedEntry[];
  tonnage: number;
  kpsh: number;
  funtikov: number;
  timeMinutes: number;
  avgWeight: number;
}

export interface ComputedWeek {
  weekId: string;
  label: string;
  isDeload: boolean;
  oneRMByExercise: Record<string, number | null>;
  days: ComputedDay[];
  tonnage: number;
  kpsh: number;
  funtikov: number;
  timeMinutes: number;
  avgWeight: number;
}

export interface ComputedCycle {
  weeks: ComputedWeek[];
  tonnage: number;
  kpsh: number;
  funtikov: number;
  timeMinutes: number;
  avgWeight: number;
}

export type IssueSeverity = 'error' | 'warning';

export interface Issue {
  severity: IssueSeverity;
  code: string;
  message: string;
  exerciseId?: string;
  weekId?: string;
  dayTemplateId?: string;
  entryId?: string;
  groupId?: string;
}
```

- [ ] **Step 4: Написать `scripts/extract_cycle8.py`**

Скрипт запускается из корня проекта. Использует `openpyxl`. Требования:

- читает `/home/UCBerkeley/Downloads/cycle8.xlsm`;
- недели: `range(1, 445, 37)`, дни: блоки строк `start+2..start+7`, `start+9..start+14`, `start+16..start+21`;
- упражнения: имя из `C`, `D` из `D`, `E` из `E` (пустое — 1), 1ПМ из `Y` первой недели;
- группы: пары `(F,G,H,I)`, `(J,K,L,M)`, `(N,O,P,Q)`, `(R,S,T,U)`; брать только `percent > 0`;
- проценты: `round(value * 100, 2)`;
- ID: `ex-01…ex-18`, `day-mon/day-wed/day-fri`, `week-1…week-12`, `entry-w1-d1-e1`, `group-w1-d1-e1-g1`;
- `funtikovTable`: индекс 0 = 0, индексы 1..100 — `F!B1:B100`;
- `progression`: `{ mode: 'compound', stepPercent: 1, deload: { mode: 'hold', reductionPercent: 10 } }`;
- `metrics.timeThresholds`: `[45,55,65,75,85]` с факторами `[0.5,0.8,0.9,1,1.1]`, fallback `1.2`;
- `impactHeavyThreshold: 0.8`, `impactLightThreshold: 0.4`, факторы `6/3/1.5`;
- пишет `src/data/cycle8.seed.json` и `tests/fixtures/cycle8.expected.json`.

Эталонный файл формируется из кэшированных значений xlsm:

- на строку упражнения: `V` тоннаж, `W` средний вес, `X` относительная интенсивность, `Z` Фунтиков, `AA` КПШ, `AB` время;
- на день: сумма `V/Z/AA` по строкам, время из строки итога дня (`start+8`, `start+15`, `start+22`) с переводом `datetime.time` в минуты;
- на неделю: `V`, `AA`, `Z`, `AB` из строки `start`, `AB` — в минуты;
- веса групп: `F/J/N/R` по порядку.

Структура expected:

```json
{
  "weeks": [
    {
      "weekId": "week-1",
      "tonnage": 39304,
      "kpsh": 818,
      "funtikov": 17762.032,
      "timeMinutes": 278,
      "days": [
        {
          "dayTemplateId": "day-mon",
          "tonnage": 0,
          "kpsh": 0,
          "funtikov": 0,
          "timeMinutes": 101,
          "entries": [
            {
              "entryId": "entry-w1-d1-e1",
              "groups": [{ "weight": 32.5 }],
              "tonnage": 2040,
              "kpsh": 48,
              "funtikov": 972.7,
              "timeMinutes": 23.4,
              "avgWeight": 42.5,
              "relativeIntensity": 0.4722
            }
          ]
        }
      ]
    }
  ]
}
```

- [ ] **Step 5: Сгенерировать JSON**

Run: `/home/UCBerkeley/.venv/bin/python scripts/extract_cycle8.py`
Expected: созданы `src/data/cycle8.seed.json` и `tests/fixtures/cycle8.expected.json`; в консоли — 12 недель, 18 упражнений, 216 строк.

- [ ] **Step 6: Создать `src/domain/seed.ts` и запустить тест**

```ts
import seedData from '../data/cycle8.seed.json';
import type { Project } from './types';

export function createSeedProject(): Project {
  return structuredClone(seedData) as Project;
}
```

Run: `npm test -- tests/domain/seed.test.ts`
Expected: PASS.

- [ ] **Step 7: Закоммитить**

```bash
git add src/domain/types.ts src/domain/seed.ts src/data/cycle8.seed.json tests/fixtures/cycle8.expected.json scripts/extract_cycle8.py tests/domain/seed.test.ts
git commit -m "feat: add project model and cycle8 seed"
```

---

### Task 3: Прогрессия, Фунтиков и время

**Files:**
- Create: `src/domain/progression.ts`
- Create: `src/domain/metrics.ts`
- Create: `tests/domain/progression.test.ts`
- Create: `tests/domain/metrics.test.ts`

**Interfaces:**
- Consumes: `ProgressionConfig`, `MetricsConfig`, `createSeedProject`.
- Produces: `trendOneRM(base: number, weekIndex: number, progression: ProgressionConfig): number`
- Produces: `effectiveOneRM(base: number, weekIndex: number, progression: ProgressionConfig, isDeload: boolean): number`
- Produces: `funtikovCoefficient(percent: number, table: number[]): number`
- Produces: `timeFactor(percent: number, config: MetricsConfig): number`
- Produces: `impactFactor(impact: number, config: MetricsConfig): number`

- [ ] **Step 1: Написать падающие тесты прогрессии**

```ts
// tests/domain/progression.test.ts
import { describe, expect, it } from 'vitest';
import { effectiveOneRM, trendOneRM } from '../../src/domain/progression';
import type { ProgressionConfig } from '../../src/domain/types';

const compound: ProgressionConfig = {
  mode: 'compound',
  stepPercent: 1,
  deload: { mode: 'hold', reductionPercent: 10 },
};

describe('trendOneRM', () => {
  it('считает сложный процент', () => {
    expect(trendOneRM(90, 1, compound)).toBe(90);
    expect(trendOneRM(90, 2, compound)).toBeCloseTo(90.9, 10);
    expect(trendOneRM(90, 3, compound)).toBeCloseTo(91.809, 10);
  });

  it('считает линейный и нулевой режимы', () => {
    expect(trendOneRM(90, 3, { ...compound, mode: 'linear', stepPercent: 2 })).toBeCloseTo(93.6, 10);
    expect(trendOneRM(90, 3, { ...compound, mode: 'none' })).toBe(90);
  });
});

describe('effectiveOneRM', () => {
  it('не сдвигает тренд после разгрузки', () => {
    expect(effectiveOneRM(90, 3, compound, true)).toBeCloseTo(90.9, 10);
    expect(effectiveOneRM(90, 4, compound, false)).toBeCloseTo(92.727, 10);
  });

  it('уменьшает на проценте разгрузки', () => {
    const reduce = { ...compound, deload: { mode: 'reduce' as const, reductionPercent: 10 } };
    expect(effectiveOneRM(90, 3, reduce, true)).toBeCloseTo(81.81, 10);
  });

  it('обрабатывает разгрузку на первой неделе', () => {
    expect(effectiveOneRM(90, 1, compound, true)).toBe(90);
    const reduce = { ...compound, deload: { mode: 'reduce' as const, reductionPercent: 10 } };
    expect(effectiveOneRM(90, 1, reduce, true)).toBeCloseTo(81, 10);
  });
});
```

- [ ] **Step 2: Написать падающие тесты коэффициентов**

```ts
// tests/domain/metrics.test.ts
import { describe, expect, it } from 'vitest';
import { createSeedProject } from '../../src/domain/seed';
import { funtikovCoefficient, impactFactor, timeFactor } from '../../src/domain/metrics';

const project = createSeedProject();
const table = project.metrics.funtikovTable;

describe('funtikovCoefficient', () => {
  it('повторяет пороги xlsm', () => {
    expect(funtikovCoefficient(29.9, table)).toBe(0);
    expect(funtikovCoefficient(30, table)).toBe(table[33]);
    expect(funtikovCoefficient(34.9, table)).toBe(table[33]);
    expect(funtikovCoefficient(35, table)).toBe(table[38]);
    expect(funtikovCoefficient(39.9, table)).toBe(table[38]);
    expect(funtikovCoefficient(40, table)).toBe(table[43]);
    expect(funtikovCoefficient(44.9, table)).toBe(table[43]);
    expect(funtikovCoefficient(45, table)).toBe(table[48]);
    expect(funtikovCoefficient(49.9, table)).toBe(table[48]);
    expect(funtikovCoefficient(50, table)).toBe(table[50]);
    expect(funtikovCoefficient(50.5, table)).toBe(table[50]);
    expect(funtikovCoefficient(99, table)).toBe(table[99]);
    expect(funtikovCoefficient(99.9, table)).toBe(table[99]);
    expect(funtikovCoefficient(100, table)).toBe(table[100]);
    expect(table[100]).toBe(25);
  });
});

describe('timeFactor', () => {
  it('повторяет пороги xlsm', () => {
    expect(timeFactor(44.9, project.metrics)).toBe(0.5);
    expect(timeFactor(45, project.metrics)).toBe(0.8);
    expect(timeFactor(54.9, project.metrics)).toBe(0.8);
    expect(timeFactor(55, project.metrics)).toBe(0.9);
    expect(timeFactor(64.9, project.metrics)).toBe(0.9);
    expect(timeFactor(65, project.metrics)).toBe(1);
    expect(timeFactor(74.9, project.metrics)).toBe(1);
    expect(timeFactor(75, project.metrics)).toBe(1.1);
    expect(timeFactor(84.9, project.metrics)).toBe(1.1);
    expect(timeFactor(85, project.metrics)).toBe(1.2);
  });
});

describe('impactFactor', () => {
  it('повторяет границы D', () => {
    expect(impactFactor(0.4, project.metrics)).toBe(1.5);
    expect(impactFactor(0.5, project.metrics)).toBe(3);
    expect(impactFactor(0.8, project.metrics)).toBe(6);
  });
});
```

- [ ] **Step 3: Запустить тесты и убедиться, что они падают**

Run: `npm test -- tests/domain/progression.test.ts tests/domain/metrics.test.ts`
Expected: FAIL — модули не найдены.

- [ ] **Step 4: Реализовать `progression.ts` и `metrics.ts`**

`trendOneRM`:

```ts
if (weekIndex < 1) throw new Error('Номер недели должен быть >= 1');
if (progression.mode === 'none') return base;
if (progression.mode === 'linear') return base * (1 + (progression.stepPercent / 100) * (weekIndex - 1));
return base * Math.pow(1 + progression.stepPercent / 100, weekIndex - 1);
```

`effectiveOneRM`:

```ts
const trend = trendOneRM(base, weekIndex, progression);
if (!isDeload) return trend;
const previous = weekIndex === 1 ? base : trendOneRM(base, weekIndex - 1, progression);
if (progression.deload.mode === 'hold') return previous;
return previous * (1 - progression.deload.reductionPercent / 100);
```

`funtikovCoefficient`:

```ts
if (!Number.isFinite(percent) || percent < 30) return 0;
if (percent < 35) return table[33];
if (percent < 40) return table[38];
if (percent < 45) return table[43];
if (percent < 50) return table[48];
if (percent === 50) return table[50];
if (percent >= 100) return table[100];
return table[Math.max(1, Math.min(100, Math.floor(percent)))];
```

`timeFactor` — пройти по `config.timeThresholds` и вернуть первый `factor`, где `percent < belowPercent`, иначе `timeFallbackFactor`.

`impactFactor` — `>= impactHeavyThreshold` → heavy; `<= impactLightThreshold` → light; иначе medium.

- [ ] **Step 5: Запустить тесты**

Run: `npm test -- tests/domain/progression.test.ts tests/domain/metrics.test.ts`
Expected: PASS.

- [ ] **Step 6: Закоммитить**

```bash
git add src/domain/progression.ts src/domain/metrics.ts tests/domain/progression.test.ts tests/domain/metrics.test.ts
git commit -m "feat: add progression and metric coefficients"
```

---

### Task 4: Расчётный движок и эталонная сверка

**Files:**
- Create: `src/domain/calculate.ts`
- Create: `tests/domain/calculate.test.ts`
- Create: `tests/domain/seedFidelity.test.ts`

**Interfaces:**
- Consumes: `Project`, `Entry`, `Exercise`, `MetricsConfig`, `ComputedCycle`, `effectiveOneRM`, `resolveStep`, `mround`, `funtikovCoefficient`, `timeFactor`, `impactFactor`.
- Produces: `calculateCycle(project: Project): ComputedCycle`
- Produces: `calculateEntry(entry: Entry, exercise: Exercise, oneRM: number | null, metrics: MetricsConfig): ComputedEntry`

- [ ] **Step 1: Написать падающие тесты расчёта**

```ts
// tests/domain/calculate.test.ts
import { describe, expect, it } from 'vitest';
import { calculateCycle } from '../../src/domain/calculate';
import { createSeedProject } from '../../src/domain/seed';

const project = createSeedProject();
const cycle = calculateCycle(project);
const week1 = cycle.weeks[0];
const monday = week1.days[0];
const press = monday.entries[0];

describe('calculateCycle', () => {
  it('считает строку Жим стоя недели 1', () => {
    expect(press.groups.map((g) => g.weight)).toEqual([32.5, 42.5, 50]);
    expect(press.tonnage).toBe(2040);
    expect(press.kpsh).toBe(48);
    expect(press.timeMinutes).toBeCloseTo(23.4, 10);
    expect(press.funtikov).toBeCloseTo(972.7, 10);
    expect(press.avgWeight).toBeCloseTo(42.5, 10);
    expect(press.relativeIntensity).toBeCloseTo(0.4722, 4);
  });

  it('считает итоги недели 1', () => {
    expect(week1.tonnage).toBe(39304);
    expect(week1.kpsh).toBe(818);
    expect(week1.funtikov).toBeCloseTo(17762.032, 3);
    expect(week1.timeMinutes).toBe(278);
  });

  it('добавляет 30 минут к непустому дню и округляет вниз', () => {
    expect(week1.days.map((d) => d.timeMinutes)).toEqual([101, 91, 86]);
  });

  it('не падает без 1ПМ и считает КПШ/время', () => {
    const broken = createSeedProject();
    broken.exercises[0].oneRM = null;
    const result = calculateCycle(broken).weeks[0].days[0].entries[0];
    expect(result.hasMissingOneRM).toBe(true);
    expect(result.groups[0].weight).toBeNull();
    expect(result.tonnage).toBe(0);
    expect(result.kpsh).toBe(48);
    expect(result.timeMinutes).toBeCloseTo(23.4, 10);
  });

  it('считает упражнение с нулевым весом', () => {
    const bodyweight = createSeedProject();
    bodyweight.weeks[0].days[0].entries[0].groups.forEach((g) => (g.percent = 0));
    const result = calculateCycle(bodyweight).weeks[0].days[0].entries[0];
    expect(result.groups.every((g) => g.weight === 0)).toBe(true);
    expect(result.tonnage).toBe(0);
    expect(result.kpsh).toBe(48);
  });
});
```

- [ ] **Step 2: Написать падающий эталонный тест**

```ts
// tests/domain/seedFidelity.test.ts
import { describe, expect, it } from 'vitest';
import expected from '../fixtures/cycle8.expected.json';
import { calculateCycle } from '../../src/domain/calculate';
import { createSeedProject } from '../../src/domain/seed';

describe('cycle8 fidelity', () => {
  it('совпадает с xlsm по всем строкам и итогам', () => {
    const cycle = calculateCycle(createSeedProject());
    for (const expectedWeek of expected.weeks) {
      const week = cycle.weeks.find((w) => w.weekId === expectedWeek.weekId)!;
      expect(week.tonnage).toBeCloseTo(expectedWeek.tonnage, 2);
      expect(week.kpsh).toBe(expectedWeek.kpsh);
      expect(week.funtikov).toBeCloseTo(expectedWeek.funtikov, 2);
      expect(week.timeMinutes).toBe(expectedWeek.timeMinutes);

      for (const expectedDay of expectedWeek.days) {
        const day = week.days.find((d) => d.dayTemplateId === expectedDay.dayTemplateId)!;
        expect(day.timeMinutes).toBe(expectedDay.timeMinutes);

        for (const expectedEntry of expectedDay.entries) {
          const entry = day.entries.find((e) => e.entryId === expectedEntry.entryId)!;
          expect(entry.groups.map((g) => g.weight)).toEqual(expectedEntry.groups.map((g) => g.weight));
          expect(entry.tonnage).toBeCloseTo(expectedEntry.tonnage, 2);
          expect(entry.kpsh).toBe(expectedEntry.kpsh);
          expect(entry.funtikov).toBeCloseTo(expectedEntry.funtikov, 2);
          expect(entry.timeMinutes).toBeCloseTo(expectedEntry.timeMinutes, 2);
          expect(entry.avgWeight).toBeCloseTo(expectedEntry.avgWeight, 2);
          expect(entry.relativeIntensity ?? 0).toBeCloseTo(expectedEntry.relativeIntensity, 2);
        }
      }
    }
  });
});
```

- [ ] **Step 3: Запустить тесты и убедиться, что они падают**

Run: `npm test -- tests/domain/calculate.test.ts tests/domain/seedFidelity.test.ts`
Expected: FAIL — `calculateCycle` не найден.

- [ ] **Step 4: Реализовать `calculate.ts`**

Алгоритм:

1. Для каждой недели построить `oneRMByExercise`: для каждого упражнения `oneRM === null ? null : effectiveOneRM(oneRM, weekIndex, progression, week.isDeload)`.
2. Для каждого `WeekDay` найти `DayTemplate` по `dayTemplateId`.
3. Для каждого `Entry` найти упражнение; если не найдено — пропустить (ошибку выдаст валидация).
4. `calculateEntry`:
   - для каждой группы:
     - `weight = oneRM === null || percent === 0 ? (percent === 0 ? 0 : null) : mround(oneRM * percent / 100, resolveStep(oneRM, exercise.rounding))`;
     - `tonnage = weight === null ? null : weight * reps * sets * multiplier`;
     - `kpsh = reps * sets`;
     - `funtikov = weight === null ? null : weight * reps * sets * funtikovCoefficient(percent, metrics.funtikovTable) * multiplier * impact`;
     - `timeMinutes = sets * timeFactor(percent, metrics) * impactFactor(impact, metrics)`;
   - `hasMissingOneRM = oneRM === null`;
   - `tonnage = сумма не-null`; `funtikov`; `kpsh`; `timeMinutes`;
   - `avgWeight = kpsh > 0 ? tonnage / kpsh : 0`;
   - `relativeIntensity = oneRM === null || multiplier <= 0 ? null : avgWeight / (oneRM * multiplier)`.
5. День: сумма по entry; `timeMinutes = sum === 0 ? 0 : Math.floor(sum + 30)`.
6. Неделя/цикл: суммы; `avgWeight = kpsh > 0 ? tonnage / kpsh : 0`.

- [ ] **Step 5: Запустить тесты**

Run: `npm test -- tests/domain/calculate.test.ts tests/domain/seedFidelity.test.ts`
Expected: PASS. Если эталон расходится, сравнить первую расходящуюся строку с xlsm и исправить формулу, а не эталон.

- [ ] **Step 6: Закоммитить**

```bash
git add src/domain/calculate.ts tests/domain/calculate.test.ts tests/domain/seedFidelity.test.ts
git commit -m "feat: add calculation engine with cycle8 fidelity tests"
```

---

### Task 5: Валидация и JSON-проект

**Files:**
- Create: `src/domain/validation.ts`
- Create: `tests/domain/validation.test.ts`
- Create: `tests/domain/projectJson.test.ts`

**Interfaces:**
- Consumes: `Project`, `Issue`.
- Produces: `validateProject(project: Project): Issue[]`
- Produces: `hasBlockingErrors(issues: Issue[]): boolean`
- Produces: `parseProjectJson(text: string): { ok: true; project: Project } | { ok: false; error: string }`
- Produces: `serializeProject(project: Project): string`

- [ ] **Step 1: Написать падающие тесты валидации**

```ts
// tests/domain/validation.test.ts
import { describe, expect, it } from 'vitest';
import { createSeedProject } from '../../src/domain/seed';
import { hasBlockingErrors, validateProject } from '../../src/domain/validation';

describe('validateProject', () => {
  it('не находит ошибок в шаблоне', () => {
    const issues = validateProject(createSeedProject());
    expect(issues.filter((i) => i.severity === 'error')).toEqual([]);
  });

  it('предупреждает о пустом 1ПМ', () => {
    const project = createSeedProject();
    project.exercises[0].oneRM = null;
    const issues = validateProject(project);
    expect(issues.some((i) => i.code === 'NO_ONE_RM' && i.exerciseId === project.exercises[0].id)).toBe(true);
  });

  it('считает процент вне диапазона ошибкой', () => {
    const project = createSeedProject();
    project.weeks[0].days[0].entries[0].groups[0].percent = 101;
    const issues = validateProject(project);
    expect(issues.some((i) => i.code === 'INVALID_PERCENT')).toBe(true);
    expect(hasBlockingErrors(issues)).toBe(true);
  });

  it('ловит ссылку на несуществующее упражнение', () => {
    const project = createSeedProject();
    project.weeks[0].days[0].entries[0].exerciseId = 'missing';
    const issues = validateProject(project);
    expect(issues.some((i) => i.code === 'UNKNOWN_EXERCISE')).toBe(true);
  });

  it('предупреждает о пустом дне и пустой неделе', () => {
    const project = createSeedProject();
    project.weeks[0].days[0].entries = [];
    const issues = validateProject(project);
    expect(issues.some((i) => i.code === 'EMPTY_DAY')).toBe(true);
  });
});
```

- [ ] **Step 2: Написать падающие тесты JSON**

```ts
// tests/domain/projectJson.test.ts
import { describe, expect, it } from 'vitest';
import { createSeedProject } from '../../src/domain/seed';
import { parseProjectJson, serializeProject } from '../../src/domain/validation';

describe('project JSON', () => {
  it('делает round-trip', () => {
    const project = createSeedProject();
    const parsed = parseProjectJson(serializeProject(project));
    expect(parsed.ok).toBe(true);
    if (parsed.ok) expect(parsed.project).toEqual(project);
  });

  it('отклоняет битый JSON', () => {
    expect(parseProjectJson('{').ok).toBe(false);
  });

  it('отклоняет чужую версию', () => {
    const project = { ...createSeedProject(), schemaVersion: 2 };
    expect(parseProjectJson(JSON.stringify(project)).ok).toBe(false);
  });

  it('отклоняет битую ссылку', () => {
    const project = createSeedProject();
    project.weeks[0].days[0].entries[0].exerciseId = 'missing';
    expect(parseProjectJson(JSON.stringify(project)).ok).toBe(false);
  });
});
```

- [ ] **Step 3: Запустить тесты и убедиться, что они падают**

Run: `npm test -- tests/domain/validation.test.ts tests/domain/projectJson.test.ts`
Expected: FAIL — модуль не найден.

- [ ] **Step 4: Реализовать `validation.ts`**

Проверить:

- `schemaVersion === 1`;
- массивы `exercises`, `dayTemplates`, `weeks`;
- `weeks.length > 0`, `dayTemplates.length > 0`;
- уникальность `id` упражнений и дней;
- `oneRM` — `null` или число `> 0`;
- `impact > 0`, `multiplier > 0`;
- `rounding` — `'auto'` или число `> 0`;
- `percent` 0..100, `reps`/`sets` — целые `>= 1`;
- ссылки `entry.exerciseId`, `day.dayTemplateId`;
- дубли `dayTemplateId` в неделе, дубли упражнения в дне;
- пустые дни/недели;
- дубли названий упражнений;
- `stepPercent >= 0`, `reductionPercent` 0..100;
- длина `funtikovTable` 101 и все числа;
- `timeThresholds` возрастают, факторы числа;
- лимиты: 52 недели, 7 дней, 20 упражнений в дне, 12 групп.

Коды из тестов: `NO_ONE_RM`, `INVALID_PERCENT`, `UNKNOWN_EXERCISE`, `EMPTY_DAY`, `EMPTY_WEEK`, `DUPLICATE_EXERCISE_NAME`, `UNUSED_EXERCISE`, `INVALID_STEP`, `INVALID_DELOAD`, `INVALID_FUNTIKOV_TABLE`, `INVALID_TIME_THRESHOLDS`, `NO_WEEKS`, `NO_DAY_TEMPLATES`, `DUPLICATE_DAY`, `DUPLICATE_EXERCISE_IN_DAY`, `TOO_MANY_WEEKS`, `TOO_MANY_DAYS`, `TOO_MANY_ENTRIES`, `TOO_MANY_GROUPS`.

`parseProjectJson`:

1. `JSON.parse` в try/catch;
2. проверить объект и `schemaVersion === 1`;
3. проверить форму (массивы, строки, числа);
4. вызвать `validateProject`; если есть `error` — вернуть `{ ok: false, error: первое сообщение }`;
5. вернуть проект.

`serializeProject` — `JSON.stringify(project, null, 2)`.

- [ ] **Step 5: Запустить тесты**

Run: `npm test -- tests/domain/validation.test.ts tests/domain/projectJson.test.ts`
Expected: PASS.

- [ ] **Step 6: Закоммитить**

```bash
git add src/domain/validation.ts tests/domain/validation.test.ts tests/domain/projectJson.test.ts
git commit -m "feat: validate projects and JSON backups"
```

---

### Task 6: Действия стора и автосохранение

**Files:**
- Create: `src/domain/ids.ts`
- Create: `src/store/projectActions.ts`
- Create: `src/store/projectStore.ts`
- Create: `tests/store/projectActions.test.ts`

**Interfaces:**
- Consumes: `Project`, `Exercise`, `SetGroup`, `createSeedProject`.
- Produces: pure-функции, перечисленные ниже.
- Produces: `useProjectStore` с полями `project` и действиями.

- [ ] **Step 1: Написать падающие тесты действий**

```ts
// tests/store/projectActions.test.ts
import { describe, expect, it } from 'vitest';
import { createSeedProject } from '../../src/domain/seed';
import {
  addEntry,
  addWeek,
  applyWave,
  duplicateWeek,
  removeExercise,
  updateGroup,
} from '../../src/store/projectActions';

describe('projectActions', () => {
  it('добавляет упражнение во все недели', () => {
    const project = createSeedProject();
    const next = addEntry(project, project.weeks[0].id, 'day-mon', 'ex-07', 'all');
    expect(project.weeks).not.toBe(next.weeks);
    for (const week of next.weeks) {
      expect(week.days[0].entries.filter((e) => e.exerciseId === 'ex-07')).toHaveLength(1);
    }
  });

  it('удаляет упражнение вместе со ссылками', () => {
    const project = createSeedProject();
    const next = removeExercise(project, 'ex-01');
    expect(next.exercises.some((e) => e.id === 'ex-01')).toBe(false);
    expect(next.weeks.some((w) => w.days.some((d) => d.entries.some((e) => e.exerciseId === 'ex-01')))).toBe(false);
  });

  it('дублирует неделю глубоко', () => {
    const project = createSeedProject();
    const next = duplicateWeek(project, project.weeks[0].id);
    expect(next.weeks).toHaveLength(project.weeks.length + 1);
    expect(next.weeks[1].days[0].entries[0].groups[0]).not.toBe(project.weeks[0].days[0].entries[0].groups[0]);
  });

  it('добавляет пустую неделю', () => {
    const project = createSeedProject();
    const next = addWeek(project);
    expect(next.weeks).toHaveLength(project.weeks.length + 1);
    expect(next.weeks.at(-1)!.days.every((d) => d.entries.length === 0)).toBe(true);
  });

  it('меняет группу', () => {
    const project = createSeedProject();
    const week = project.weeks[0];
    const entry = week.days[0].entries[0];
    const next = updateGroup(project, week.id, 'day-mon', entry.id, entry.groups[0].id, { percent: 40 });
    expect(next.weeks[0].days[0].entries[0].groups[0].percent).toBe(40);
  });

  it('сдвигает верхнюю группу и сохраняет разницу', () => {
    const project = createSeedProject();
    const weekIds = project.weeks.slice(0, 3).map((w) => w.id);
    const next = applyWave(project, {
      weekIds,
      exerciseIds: ['ex-01'],
      mode: 'linear',
      startPercent: 50,
      stepPercent: 5,
    });
    const tops = weekIds.map((weekId) => {
      const week = next.weeks.find((w) => w.id === weekId)!;
      const entry = week.days[0].entries.find((e) => e.exerciseId === 'ex-01')!;
      return Math.max(...entry.groups.map((g) => g.percent));
    });
    expect(tops).toEqual([50, 55, 60]);
    const shifted = next.weeks[0].days[0].entries[0].groups.map((g) => g.percent);
    expect(shifted).toEqual([30, 43, 50]);
  });
});
```

- [ ] **Step 2: Запустить тесты и убедиться, что они падают**

Run: `npm test -- tests/store/projectActions.test.ts`
Expected: FAIL — модуль не найден.

- [ ] **Step 3: Реализовать `ids.ts` и `projectActions.ts`**

`ids.ts`:

```ts
export function newId(prefix: string): string {
  return `${prefix}-${crypto.randomUUID()}`;
}
```

`projectActions.ts` — чистые функции, не мутируют вход. Обязательные функции:

```ts
addExercise(project, input): Project
updateExercise(project, id, patch): Project
removeExercise(project, id): Project
addDayTemplate(project, name): Project
renameDayTemplate(project, id, name): Project
removeDayTemplate(project, id): Project
moveDayTemplate(project, id, direction: -1 | 1): Project
addWeek(project, copyFromWeekId?): Project
duplicateWeek(project, weekId): Project
removeWeek(project, weekId): Project
moveWeek(project, weekId, direction: -1 | 1): Project
setWeekDeload(project, weekId, value): Project
addEntry(project, weekId, dayTemplateId, exerciseId, scope: 'week' | 'all'): Project
removeEntry(project, weekId, dayTemplateId, entryId, scope: 'week' | 'all'): Project
moveEntry(project, weekId, dayTemplateId, entryId, direction: -1 | 1): Project
addGroup(project, weekId, dayTemplateId, entryId): Project
updateGroup(project, weekId, dayTemplateId, entryId, groupId, patch): Project
removeGroup(project, weekId, dayTemplateId, entryId, groupId): Project
applyWave(project, payload): Project
```

Правила:

- `addEntry` с `scope='all'` добавляет во все недели, если упражнения ещё нет в этом дне;
- `removeEntry` с `scope='all'` удаляет все записи с тем же `exerciseId` из этого дня во всех неделях;
- `duplicateWeek` копирует дни и группы с новыми ID, вставляет после исходной и переименовывает `Неделя N`;
- `addWeek` без копии создаёт дни по всем `dayTemplates` с пустыми `entries`;
- `applyWave` реализует формулу из спецификации 6.5: цель — верхняя группа, сдвиг всех групп на `delta`, clamp 0..100;
- все действия обновляют `updatedAt`.

- [ ] **Step 4: Создать `projectStore.ts`**

```ts
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { createSeedProject } from '../domain/seed';
import type { Project } from '../domain/types';
import * as actions from './projectActions';

interface ProjectState {
  project: Project;
  setProject: (project: Project) => void;
  resetToSeed: () => void;
  renameProject: (name: string) => void;
  addExercise: (input: Parameters<typeof actions.addExercise>[1]) => void;
  updateExercise: (id: string, patch: Parameters<typeof actions.updateExercise>[2]) => void;
  removeExercise: (id: string) => void;
  addDayTemplate: (name: string) => void;
  renameDayTemplate: (id: string, name: string) => void;
  removeDayTemplate: (id: string) => void;
  moveDayTemplate: (id: string, direction: -1 | 1) => void;
  addWeek: (copyFromWeekId?: string) => void;
  duplicateWeek: (weekId: string) => void;
  removeWeek: (weekId: string) => void;
  moveWeek: (weekId: string, direction: -1 | 1) => void;
  setWeekDeload: (weekId: string, value: boolean) => void;
  addEntry: (weekId: string, dayTemplateId: string, exerciseId: string, scope: 'week' | 'all') => void;
  removeEntry: (weekId: string, dayTemplateId: string, entryId: string, scope: 'week' | 'all') => void;
  moveEntry: (weekId: string, dayTemplateId: string, entryId: string, direction: -1 | 1) => void;
  addGroup: (weekId: string, dayTemplateId: string, entryId: string) => void;
  updateGroup: (weekId: string, dayTemplateId: string, entryId: string, groupId: string, patch: Partial<Pick<SetGroup, 'percent' | 'reps' | 'sets'>>) => void;
  removeGroup: (weekId: string, dayTemplateId: string, entryId: string, groupId: string) => void;
  applyWave: (payload: Parameters<typeof actions.applyWave>[1]) => void;
}
```

`persist`:

```ts
name: 'cycle-builder.project.v1',
version: 1,
storage: createJSONStorage(() => localStorage),
partialize: (state) => ({ project: state.project }),
```

Каждое действие: `set((state) => ({ project: actions.x(state.project, ...) }))`.

- [ ] **Step 5: Запустить тесты**

Run: `npm test -- tests/store/projectActions.test.ts`
Expected: PASS.

- [ ] **Step 6: Закоммитить**

```bash
git add src/domain/ids.ts src/store tests/store
git commit -m "feat: add project actions and persisted store"
```

---

### Task 7: Оболочка, навигация, обзор и форматирование

**Files:**
- Create: `src/selectors/useComputedCycle.ts`
- Create: `src/utils/format.ts`
- Create: `src/components/AppShell.tsx`
- Create: `src/pages/OverviewPage.tsx`
- Create: `tests/utils/format.test.ts`
- Modify: `src/App.tsx`, `src/styles/app.css`

**Interfaces:**
- Consumes: `calculateCycle`, `validateProject`, `useProjectStore`.
- Produces: `useComputedCycle(): { cycle: ComputedCycle; issues: Issue[] }`
- Produces: `formatKg(value: number | null): string`
- Produces: `formatPercent(value: number): string`
- Produces: `formatMinutes(value: number): string`
- Produces: `AppShell` с навигацией `Обзор | Программа | Упражнения | Настройки | Экспорт`.

- [ ] **Step 1: Написать падающие тесты форматирования**

```ts
// tests/utils/format.test.ts
import { describe, expect, it } from 'vitest';
import { formatKg, formatMinutes, formatPercent } from '../../src/utils/format';

describe('format', () => {
  it('форматирует вес', () => {
    expect(formatKg(85)).toBe('85 кг');
    expect(formatKg(32.5)).toBe('32.5 кг');
    expect(formatKg(null)).toBe('—');
  });

  it('форматирует проценты', () => {
    expect(formatPercent(47.5)).toBe('47.5%');
    expect(formatPercent(50)).toBe('50%');
  });

  it('форматирует время', () => {
    expect(formatMinutes(0)).toBe('0 мин');
    expect(formatMinutes(23.4)).toBe('23.4 мин');
    expect(formatMinutes(278)).toBe('4 ч 38 мин');
  });
});
```

- [ ] **Step 2: Запустить тест и убедиться, что он падает**

Run: `npm test -- tests/utils/format.test.ts`
Expected: FAIL.

- [ ] **Step 3: Реализовать селектор и форматирование**

`useComputedCycle`:

```ts
export function useComputedCycle() {
  const project = useProjectStore((s) => s.project);
  return useMemo(
    () => ({ cycle: calculateCycle(project), issues: validateProject(project) }),
    [project],
  );
}
```

`formatKg`: число без лишних нулей, суффикс `кг`; `null` → `—`.
`formatPercent`: число без лишних нулей, суффикс `%`.
`formatMinutes`: `< 60` → `N мин`; иначе `X ч Y мин`.

- [ ] **Step 4: Реализовать `AppShell` и `OverviewPage`**

`AppShell`:

- боковая навигация с иконками Lucide;
- заголовок проекта;
- индикатор «Сохранено» (можно статический, обновляемый по `updatedAt`);
- кнопки «Печать» и «Excel» ведут на страницу экспорта;
- адаптив: на узком экране навигация сворачивается в верхнюю панель.

`OverviewPage`:

- KPI: недели, тренировки, упражнения, тоннаж, КПШ, время;
- столбчатый график тоннажа по неделям на CSS;
- список недель с кнопкой «Открыть»;
- список ошибок и предупреждений с цветовой маркировкой.

`App.tsx` хранит `page` в состоянии и переключает страницы; страницы `Program`, `Exercises`, `Settings`, `Export` на этом шаге могут быть заглушками.

- [ ] **Step 5: Запустить тесты и сборку**

Run: `npm test -- tests/utils/format.test.ts`
Expected: PASS.

Run: `npm run build`
Expected: PASS.

- [ ] **Step 6: Закоммитить**

```bash
git add src/selectors src/utils src/components/AppShell.tsx src/pages/OverviewPage.tsx src/App.tsx src/styles/app.css tests/utils/format.test.ts
git commit -m "feat: add app shell and cycle overview"
```

---

### Task 8: Страница упражнений

**Files:**
- Create: `src/pages/ExercisesPage.tsx`
- Create: `src/components/NumberInput.tsx`
- Create: `src/components/ConfirmDialog.tsx`
- Modify: `src/styles/app.css`

**Interfaces:**
- Consumes: `useProjectStore`, `formatKg`.
- Produces: компоненты `NumberInput` и `ConfirmDialog` для повторного использования.

- [ ] **Step 1: Реализовать `NumberInput` и `ConfirmDialog`**

`NumberInput`:

```ts
interface NumberInputProps {
  label: string;
  value: number | null;
  onChange: (value: number | null) => void;
  min?: number;
  max?: number;
  step?: number;
  suffix?: string;
  disabled?: boolean;
}
```

- пустое поле → `null`;
- `onChange` получает число или `null`;
- `aria-label` обязателен.

`ConfirmDialog`:

```ts
interface ConfirmDialogProps {
  open: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  onConfirm: () => void;
  onCancel: () => void;
}
```

- `role="dialog"`, `aria-modal="true"`, кнопки «Отмена» и подтверждение.

- [ ] **Step 2: Реализовать `ExercisesPage`**

- Таблица: название, 1ПМ, `D`, `E`, округление, использований.
- Поиск по названию.
- Inline-редактирование через `NumberInput` и текстовое поле названия.
- Добавление упражнения: форма сверху (название, 1ПМ, D, E, округление) → `addExercise`.
- Удаление: `ConfirmDialog` с числом использований; после подтверждения `removeExercise`.
- Подсказки: `D` — коэффициент воздействия, `E` — множитель для гантелей/блока.
- Округление: селект `Авто | 2.5 | 1 | 0.5 | 0.25 | 0.1`.

- [ ] **Step 3: Проверить сборку**

Run: `npm run build`
Expected: PASS.

- [ ] **Step 4: Ручная проверка**

Run: `npm run dev`
Проверить: изменить 1ПМ «Жим стоя» на 100 → на «Обзоре» тоннаж изменился; добавить упражнение; удалить его.

- [ ] **Step 5: Закоммитить**

```bash
git add src/pages/ExercisesPage.tsx src/components/NumberInput.tsx src/components/ConfirmDialog.tsx src/styles/app.css
git commit -m "feat: add exercise library editor"
```

---

### Task 9: Страница программы и редактор групп

**Files:**
- Create: `src/pages/ProgramPage.tsx`
- Create: `src/components/WeekTabs.tsx`
- Create: `src/components/DayCard.tsx`
- Create: `src/components/EntryRow.tsx`
- Create: `src/components/GroupEditor.tsx`
- Create: `tests/components/ProgramPage.test.tsx`
- Modify: `src/styles/app.css`

**Interfaces:**
- Consumes: `useComputedCycle`, `useProjectStore`, `formatKg`, `formatPercent`, `formatMinutes`.
- Produces: компоненты отображения недели/дня/строки/группы.

- [ ] **Step 1: Написать падающий компонентный тест**

```tsx
// tests/components/ProgramPage.test.tsx
import { beforeEach, describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ProgramPage from '../../src/pages/ProgramPage';
import { useProjectStore } from '../../src/store/projectStore';
import { createSeedProject } from '../../src/domain/seed';

beforeEach(() => {
  useProjectStore.setState({ project: createSeedProject() });
});

describe('ProgramPage', () => {
  it('показывает веса шаблона', () => {
    render(<ProgramPage />);
    expect(screen.getByText('Жим стоя')).toBeInTheDocument();
    expect(screen.getAllByText('32.5 кг').length).toBeGreaterThan(0);
  });

  it('пересчитывает вес при изменении процента', async () => {
    const user = userEvent.setup();
    render(<ProgramPage />);
    await user.click(screen.getByLabelText('Группа 1 упражнения Жим стоя'));
    const input = screen.getByLabelText('Процент группы 1');
    await user.clear(input);
    await user.type(input, '40');
    expect(screen.getAllByText('36 кг').length).toBeGreaterThan(0);
  });
});
```

- [ ] **Step 2: Запустить тест и убедиться, что он падает**

Run: `npm test -- tests/components/ProgramPage.test.tsx`
Expected: FAIL — компонент не найден.

- [ ] **Step 3: Реализовать компоненты**

`WeekTabs`:

- лента недель с номером, `isDeload`-бейджем;
- add/duplicate/delete; удаление с подтверждением;
- выбранная неделя хранится в `ProgramPage`.

`DayCard`:

- заголовок дня;
- список `EntryRow`;
- итоги: тоннаж, КПШ, время.

`EntryRow`:

- название упражнения и 1ПМ недели;
- группы в виде кнопок `3×10 @ 60%` с весом;
- при клике открывается `GroupEditor`;
- кнопка «Добавить группу»;
- удаление группы и упражнения;
- метрики строки.

`GroupEditor`:

- три `NumberInput`: подходы, повторы, процент;
- живой вес;
- кнопка «Удалить группу»;
- `aria-label` по шаблону `Процент группы 1`, `Повторы группы 1`, `Подходы группы 1`.

`ProgramPage`:

- `useComputedCycle`;
- выбирает вычисленную неделю по ID;
- при отсутствии недель — пустое состояние;
- кнопки структуры (Task 10) подключаются позже.

- [ ] **Step 4: Запустить тест**

Run: `npm test -- tests/components/ProgramPage.test.tsx`
Expected: PASS.

- [ ] **Step 5: Проверить сборку**

Run: `npm run build`
Expected: PASS.

- [ ] **Step 6: Закоммитить**

```bash
git add src/pages/ProgramPage.tsx src/components/WeekTabs.tsx src/components/DayCard.tsx src/components/EntryRow.tsx src/components/GroupEditor.tsx tests/components/ProgramPage.test.tsx src/styles/app.css
git commit -m "feat: add program editor with live group recalculation"
```

---

### Task 10: Редактирование структуры и генератор волны

**Files:**
- Create: `src/components/StructureEditor.tsx`
- Create: `src/components/WaveGeneratorDialog.tsx`
- Modify: `src/pages/ProgramPage.tsx`, `src/styles/app.css`

**Interfaces:**
- Consumes: `useProjectStore`, `useComputedCycle`.
- Produces: панель структуры и диалог волны.

- [ ] **Step 1: Реализовать `StructureEditor`**

- Список дней: переименование, перемещение вверх/вниз, удаление (с подтверждением).
- Добавление дня.
- Для выбранной недели и дня:
  - выбор упражнения из справочника;
  - кнопка «Добавить в эту неделю»;
  - кнопка «Добавить во все недели»;
  - удаление упражнения из дня (в этой неделе / во всех).
- Перемещение упражнений вверх/вниз.

- [ ] **Step 2: Реализовать `WaveGeneratorDialog`**

Поля:

- чекбоксы недель (все / диапазон);
- чекбоксы упражнений;
- режим `linear | wave | constant`;
- стартовый процент;
- шаг;
- предпросмотр целевых процентов по неделям;
- кнопка «Применить» → `applyWave`.

- [ ] **Step 3: Подключить к `ProgramPage`**

- Кнопка «Структура» открывает панель.
- Кнопка «Волна» открывает диалог.
- После применения обновляются веса и итоги.

- [ ] **Step 4: Проверить сборку и тесты**

Run: `npm test`
Expected: PASS.

Run: `npm run build`
Expected: PASS.

- [ ] **Step 5: Ручная проверка**

Run: `npm run dev`
Проверить: добавить день, добавить упражнение во все недели, удалить его, применить волну 50→60% и увидеть изменение весов.

- [ ] **Step 6: Закоммитить**

```bash
git add src/components/StructureEditor.tsx src/components/WaveGeneratorDialog.tsx src/pages/ProgramPage.tsx src/styles/app.css
git commit -m "feat: add structure editor and wave generator"
```

---

### Task 11: Настройки и JSON-бэкап

**Files:**
- Create: `src/pages/SettingsPage.tsx`
- Create: `src/export/json.ts`
- Modify: `src/App.tsx`, `src/styles/app.css`

**Interfaces:**
- Consumes: `useProjectStore`, `parseProjectJson`, `serializeProject`, `validateProject`, `createSeedProject`.
- Produces: `downloadProjectJson(project: Project): void`
- Produces: `readProjectJsonFile(file: File): Promise<{ ok: true; project: Project } | { ok: false; error: string }>`

- [ ] **Step 1: Реализовать `export/json.ts`**

```ts
export function downloadProjectJson(project: Project): void
export async function readProjectJsonFile(file: File): Promise<ParseResult>
```

`downloadProjectJson`: `Blob` с `serializeProject`, имя `cycle-builder-backup-YYYY-MM-DD.json`, скачивание через временный `<a>`.

`readProjectJsonFile`: `file.text()` → `parseProjectJson`.

- [ ] **Step 2: Реализовать `SettingsPage`**

- Название проекта.
- Прогрессия: режим, шаг, режим разгрузки, процент уменьшения.
- Округление по умолчанию.
- Метрики: раскрывающаяся таблица Фунтикова (101 строка), пороги времени, факторы D.
- JSON: кнопка «Скачать копию», input `type="file"` с импортом и подтверждением.
- «Сбросить к шаблону cycle8» с подтверждением.
- Все изменения — через `useProjectStore`.

- [ ] **Step 3: Проверить сборку**

Run: `npm run build`
Expected: PASS.

- [ ] **Step 4: Ручная проверка**

Скачать JSON → изменить 1ПМ → импортировать JSON → значение вернулось. Импортировать битый файл → показана ошибка, проект не изменился.

- [ ] **Step 5: Закоммитить**

```bash
git add src/pages/SettingsPage.tsx src/export/json.ts src/App.tsx src/styles/app.css
git commit -m "feat: add settings and JSON backup"
```

---

### Task 12: Экспорт Excel

**Files:**
- Create: `src/export/excel.ts`
- Create: `src/pages/ExportPage.tsx`
- Create: `tests/export/excel.test.ts`
- Modify: `src/App.tsx`, `src/styles/app.css`

**Interfaces:**
- Consumes: `Project`, `ComputedCycle`, `ExcelJS`.
- Produces: `buildWorkbook(project: Project, cycle: ComputedCycle): Promise<Workbook>`
- Produces: `downloadExcel(project: Project, cycle: ComputedCycle): Promise<void>`

- [ ] **Step 1: Написать падающий тест Excel**

```ts
// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { buildWorkbook } from '../../src/export/excel';
import { calculateCycle } from '../../src/domain/calculate';
import { createSeedProject } from '../../src/domain/seed';

describe('buildWorkbook', () => {
  it('создаёт сводку и листы недель', async () => {
    const project = createSeedProject();
    const wb = await buildWorkbook(project, calculateCycle(project));
    expect(wb.worksheets.map((w) => w.name)).toEqual([
      'Сводка',
      ...project.weeks.map((_, i) => `Неделя ${i + 1}`),
    ]);
    const summary = wb.getWorksheet('Сводка')!;
    expect(summary.rowCount).toBe(project.weeks.length + 2);
    expect(summary.getCell(`A${project.weeks.length + 2}`).value).toBe('Итого');
    const week = wb.getWorksheet('Неделя 1')!;
    expect(week.getCell('A1').value).toContain('Неделя 1');
    expect(week.getCell('A2').value).toBe('День');
    expect(week.getCell('B2').value).toBe('Упражнение');
    expect(week.getCell('F2').value).toBe('Вес');
  });
});
```

- [ ] **Step 2: Запустить тест и убедиться, что он падает**

Run: `npm test -- tests/export/excel.test.ts`
Expected: FAIL — модуль не найден.

- [ ] **Step 3: Реализовать `buildWorkbook`**

- «Сводка»: заголовки `Неделя | Тоннаж | КПШ | Время (мин) | Средний вес | Фунтиков`; по строке на неделю; итоговая строка.
- «Неделя N»:
  - `A1` — `{project.name} — Неделя N`;
  - `A2:H2` — заголовки;
  - по одной строке на группу;
  - объединение ячейки дня по вертикали;
  - итог дня и итог недели;
  - ширины колонок, числовые форматы, закрепление `A3`;
  - стили: жирная шапка, серый фон итогов, тонкие границы.
- `downloadExcel`: `writeBuffer()` → `Blob` → скачивание `cycle-builder-YYYY-MM-DD.xlsx`.

- [ ] **Step 4: Реализовать `ExportPage`**

- выбор области (весь цикл / неделя / день);
- кнопка «Скачать Excel»;
- кнопка «Печать» (подключить в Task 13);
- при ошибках валидации — сообщение и disabled-кнопки.

- [ ] **Step 5: Запустить тест**

Run: `npm test -- tests/export/excel.test.ts`
Expected: PASS.

- [ ] **Step 6: Закоммитить**

```bash
git add src/export/excel.ts src/pages/ExportPage.tsx tests/export/excel.test.ts src/App.tsx src/styles/app.css
git commit -m "feat: export program to Excel"
```

---

### Task 13: Печать и PDF

**Files:**
- Create: `src/components/PrintView.tsx`
- Create: `src/styles/print.css`
- Modify: `src/pages/ExportPage.tsx`, `src/styles/app.css`

**Interfaces:**
- Consumes: `Project`, `ComputedCycle`, `formatKg`, `formatMinutes`.
- Produces: `PrintView({ project, cycle, scope }: PrintViewProps)`.

- [ ] **Step 1: Реализовать `PrintView`**

- Принимает `scope: { type: 'cycle' } | { type: 'week'; weekId: string } | { type: 'day'; weekId: string; dayTemplateId: string }`.
- Для каждой недели/дня выводит:
  - шапку с названием проекта и недели;
  - таблицу: упражнение, подходы, повторы, %, вес;
  - итоги дня и недели.
- Класс `print-view`.

- [ ] **Step 2: Реализовать `print.css`**

```css
@page { size: A4 portrait; margin: 12mm; }
@media print {
  .app-shell, .no-print { display: none !important; }
  .print-view { display: block !important; }
  .print-week { break-after: page; }
  .print-week:last-child { break-after: auto; }
  body { background: #fff; color: #000; }
  .print-view table { width: 100%; border-collapse: collapse; font-size: 10pt; }
  .print-view th, .print-view td { border: 1px solid #000; padding: 2mm; }
}
```

- [ ] **Step 3: Подключить печать в `ExportPage`**

- Кнопка «Печать» рендерит `PrintView` и вызывает `window.print()`.
- Предпросмотр печати отображается на странице (экранный режим).

- [ ] **Step 4: Проверить сборку**

Run: `npm run build`
Expected: PASS.

- [ ] **Step 5: Ручная проверка**

Открыть печать в браузере, убедиться: интерфейс скрыт, недели на отдельных страницах, таблицы не обрезаны.

- [ ] **Step 6: Закоммитить**

```bash
git add src/components/PrintView.tsx src/styles/print.css src/pages/ExportPage.tsx src/styles/app.css
git commit -m "feat: add printable program and PDF export"
```

---

### Task 14: Финальная интеграция и проверка

**Files:**
- Create: `README.md`
- Modify: `src/App.tsx`, `src/styles/app.css`, `package.json` (при необходимости)

**Interfaces:**
- Consumes: все предыдущие задачи.

- [ ] **Step 1: Собрать все страницы в `App.tsx`**

- `Обзор`, `Программа`, `Упражнения`, `Настройки`, `Экспорт` подключены.
- Переходы из «Обзора» к неделе работают.
- Заголовочные кнопки «Печать»/«Excel» ведут на экспорт.

- [ ] **Step 2: Написать `README.md`**

- что это;
- команды `npm install`, `npm run dev`, `npm test`, `npm run build`;
- источник шаблона и предупреждение, что это не медицинская рекомендация;
- как сделать JSON-бэкап.

- [ ] **Step 3: Прогнать все тесты**

Run: `npm test`
Expected: PASS, включая `seedFidelity`.

- [ ] **Step 4: Прогнать сборку**

Run: `npm run build`
Expected: PASS.

- [ ] **Step 5: Проверить приложение вживую**

Run: `npm run dev -- --host 127.0.0.1` в фоне.
Проверить `curl -I http://127.0.0.1:5173` → `200 OK`.
Остановить сервер.

- [ ] **Step 6: Финальный коммит**

```bash
git add README.md src
git commit -m "feat: finish cycle builder app"
```

---

## Самопроверка плана

- **Покрытие спецификации:** назначение и границы — Tasks 1–14; модель — Task 2; расчёты — Tasks 1, 3, 4; валидация — Task 5; UI — Tasks 7–11, 13; Excel — Task 12; JSON — Tasks 5, 11; сохранение — Task 6; шаблон — Task 2; тесты — Tasks 1–6, 9, 12.
- **Типы:** `Project.defaultRounding`, `ComputedCycle`, `ComputedEntry`, `Issue` определены в Task 2; все последующие задачи используют эти имена.
- **Review Focus:** пять пунктов закреплены тестами в Tasks 3, 4, 5.
- **Пропорция:** план описывает интерфейсы и проверки, а не тела всех компонентов; алгоритмы вынесены в доменные задачи.
