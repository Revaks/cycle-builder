import { describe, expect, it } from 'vitest';
import expected from '../fixtures/cycle8.expected.json';
import { calculateCycle } from '../../src/domain/calculate';
import { createSeedProject } from '../../src/domain/seed';

describe('cycle8 fidelity', () => {
  it('совпадает с xlsm по всем строкам и итогам', () => {
    const cycle = calculateCycle(createSeedProject());
    expect(cycle.weeks).toHaveLength(12);
    expect(expected.weeks).toHaveLength(12);
    let dayCount = 0;
    let entryCount = 0;
    let groupCount = 0;

    for (const expectedWeek of expected.weeks) {
      const week = cycle.weeks.find((w) => w.weekId === expectedWeek.weekId)!;
      expect(week.tonnage).toBeCloseTo(expectedWeek.tonnage, 2);
      expect(week.kpsh).toBe(expectedWeek.kpsh);
      expect(week.funtikov).toBeCloseTo(expectedWeek.funtikov, 2);
      expect(week.timeMinutes).toBe(expectedWeek.timeMinutes);

      expect(week.days).toHaveLength(3);
      for (const expectedDay of expectedWeek.days) {
        const day = week.days.find((d) => d.dayTemplateId === expectedDay.dayTemplateId)!;
        dayCount += 1;
        expect(day.entries).toHaveLength(expectedDay.entries.length);
        expect(day.tonnage).toBeCloseTo(expectedDay.tonnage, 2);
        expect(day.kpsh).toBe(expectedDay.kpsh);
        expect(day.funtikov).toBeCloseTo(expectedDay.funtikov, 2);
        expect(day.timeMinutes).toBe(expectedDay.timeMinutes);

        for (const expectedEntry of expectedDay.entries) {
          const entry = day.entries.find((e) => e.entryId === expectedEntry.entryId)!;
          entryCount += 1;
          groupCount += entry.groups.length;
          expect(entry.groups).toHaveLength(expectedEntry.groups.length);
          expect(entry.groups.map((g) => g.weight)).toEqual(expectedEntry.groups.map((g) => g.weight));
          expect(entry.tonnage).toBeCloseTo(expectedEntry.tonnage, 2);
          expect(entry.kpsh).toBe(expectedEntry.kpsh);
          expect(entry.funtikov).toBeCloseTo(expectedEntry.funtikov, 2);
          expect(entry.timeMinutes).toBeCloseTo(expectedEntry.timeMinutes, 2);
          expect(entry.avgWeight ?? 0).toBeCloseTo(expectedEntry.avgWeight, 2);
          expect(entry.relativeIntensity ?? 0).toBeCloseTo(expectedEntry.relativeIntensity, 2);
        }
      }
    }

    expect(dayCount).toBe(36);
    expect(entryCount).toBe(216);
    expect(groupCount).toBe(376);
  });
});
