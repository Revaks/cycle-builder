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
    expect(press.avgWeight ?? 0).toBeCloseTo(42.5, 10);
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
    expect(result.weightedKpsh).toBe(0);
    expect(result.avgWeight).toBeNull();
    expect(result.timeMinutes).toBeCloseTo(23.4, 10);
  });

  it('исключает КПШ без 1ПМ из среднего веса дня и недели', () => {
    const broken = createSeedProject();
    broken.exercises[0].oneRM = null;
    const week = calculateCycle(broken).weeks[0];
    const day = week.days[0];
    const validDayKpsh = day.entries
      .filter((entry) => !entry.hasMissingOneRM)
      .reduce((sum, entry) => sum + entry.kpsh, 0);
    const validWeekKpsh = week.days
      .flatMap((item) => item.entries)
      .filter((entry) => !entry.hasMissingOneRM)
      .reduce((sum, entry) => sum + entry.kpsh, 0);
    expect(day.avgWeight ?? 0).toBeCloseTo(day.tonnage / validDayKpsh, 10);
    expect(week.avgWeight ?? 0).toBeCloseTo(week.tonnage / validWeekKpsh, 10);
  });

  it('возвращает null среднего веса, если нет ни одного 1ПМ', () => {
    const broken = createSeedProject();
    broken.exercises.forEach((exercise) => (exercise.oneRM = null));
    const result = calculateCycle(broken);
    expect(result.avgWeight).toBeNull();
    expect(result.weeks[0].avgWeight).toBeNull();
    expect(result.weeks[0].days[0].avgWeight).toBeNull();
  });

  it('возвращает 0 времени для пустого дня', () => {
    const empty = createSeedProject();
    empty.weeks[0].days[0].entries = [];
    const day = calculateCycle(empty).weeks[0].days[0];
    expect(day.timeMinutes).toBe(0);
    expect(day.tonnage).toBe(0);
  });

  it('возвращает 0 времени, если все факторы времени нулевые', () => {
    const zeroTime = createSeedProject();
    zeroTime.metrics.timeThresholds.forEach((threshold) => (threshold.factor = 0));
    zeroTime.metrics.timeFallbackFactor = 0;
    const day = calculateCycle(zeroTime).weeks[0].days[0];
    expect(day.entries.length).toBeGreaterThan(0);
    expect(day.timeMinutes).toBe(0);
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
