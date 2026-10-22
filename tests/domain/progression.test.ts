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
    expect(effectiveOneRM(90, 4, compound, false)).toBeCloseTo(90 * Math.pow(1.01, 3), 10);
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
