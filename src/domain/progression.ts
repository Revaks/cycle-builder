import type { ProgressionConfig } from './types';

export function trendOneRM(
  base: number,
  weekIndex: number,
  progression: ProgressionConfig,
): number {
  if (weekIndex < 1) throw new Error('Номер недели должен быть >= 1');
  if (progression.mode === 'none') return base;
  if (progression.mode === 'linear') {
    return base * (1 + (progression.stepPercent / 100) * (weekIndex - 1));
  }
  return base * Math.pow(1 + progression.stepPercent / 100, weekIndex - 1);
}

export function effectiveOneRM(
  base: number,
  weekIndex: number,
  progression: ProgressionConfig,
  isDeload: boolean,
): number {
  const trend = trendOneRM(base, weekIndex, progression);
  if (!isDeload) return trend;
  const previous = weekIndex === 1 ? base : trendOneRM(base, weekIndex - 1, progression);
  if (progression.deload.mode === 'hold') return previous;
  return previous * (1 - progression.deload.reductionPercent / 100);
}
