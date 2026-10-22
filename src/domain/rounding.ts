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
