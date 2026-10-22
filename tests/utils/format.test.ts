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
