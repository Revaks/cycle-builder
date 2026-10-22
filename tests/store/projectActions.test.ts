import { describe, expect, it } from 'vitest';
import { createSeedProject } from '../../src/domain/seed';
import {
  addEntry,
  addWeek,
  applyWave,
  duplicateWeek,
  removeExercise,
  setDefaultRounding,
  setMetrics,
  setProgression,
  updateGroup,
  waveTargetPercent,
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

  it('строит целевую волну процентов', () => {
    expect([0, 1, 2, 3].map((index) => waveTargetPercent('wave', 50, 5, index))).toEqual([
      50, 55, 45, 50,
    ]);
    expect([0, 1, 2].map((index) => waveTargetPercent('constant', 50, 5, index))).toEqual([
      50, 50, 50,
    ]);
    expect([0, 1, 2].map((index) => waveTargetPercent('linear', 50, 5, index))).toEqual([
      50, 55, 60,
    ]);
  });

  it('обновляет настройки прогрессии, округления и метрик', () => {
    const project = createSeedProject();
    const progressed = setProgression(project, {
      mode: 'linear',
      stepPercent: 2,
      deload: { mode: 'reduce', reductionPercent: 15 },
    });
    expect(progressed.progression.stepPercent).toBe(2);

    const rounded = setDefaultRounding(progressed, 0.5);
    expect(rounded.defaultRounding).toBe(0.5);

    const metrics = { ...rounded.metrics, timeFallbackFactor: 1.3 };
    const withMetrics = setMetrics(rounded, metrics);
    expect(withMetrics.metrics.timeFallbackFactor).toBe(1.3);
  });
});
