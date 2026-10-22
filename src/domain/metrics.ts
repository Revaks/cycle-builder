import type { MetricsConfig } from './types';

export function funtikovCoefficient(percent: number, table: number[]): number {
  if (!Number.isFinite(percent) || percent < 30) return 0;
  if (percent < 35) return table[33];
  if (percent < 40) return table[38];
  if (percent < 45) return table[43];
  if (percent < 50) return table[48];
  if (percent === 50) return table[50];
  if (percent >= 100) return table[100];
  return table[Math.max(1, Math.min(100, Math.floor(percent)))];
}

export function timeFactor(percent: number, config: MetricsConfig): number {
  for (const threshold of config.timeThresholds) {
    if (percent < threshold.belowPercent) return threshold.factor;
  }
  return config.timeFallbackFactor;
}

export function impactFactor(impact: number, config: MetricsConfig): number {
  if (impact >= config.impactHeavyThreshold) return config.impactHeavyFactor;
  if (impact <= config.impactLightThreshold) return config.impactLightFactor;
  return config.impactMediumFactor;
}
