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
