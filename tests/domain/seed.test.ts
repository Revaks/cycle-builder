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
