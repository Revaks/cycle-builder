import { describe, expect, it } from 'vitest';
import { createSeedProject } from '../../src/domain/seed';
import { funtikovCoefficient, impactFactor, timeFactor } from '../../src/domain/metrics';

const project = createSeedProject();
const table = project.metrics.funtikovTable;

describe('funtikovCoefficient', () => {
  it('повторяет пороги xlsm', () => {
    expect(funtikovCoefficient(29.9, table)).toBe(0);
    expect(funtikovCoefficient(30, table)).toBe(table[33]);
    expect(funtikovCoefficient(34.9, table)).toBe(table[33]);
    expect(funtikovCoefficient(35, table)).toBe(table[38]);
    expect(funtikovCoefficient(39.9, table)).toBe(table[38]);
    expect(funtikovCoefficient(40, table)).toBe(table[43]);
    expect(funtikovCoefficient(44.9, table)).toBe(table[43]);
    expect(funtikovCoefficient(45, table)).toBe(table[48]);
    expect(funtikovCoefficient(49.9, table)).toBe(table[48]);
    expect(funtikovCoefficient(50, table)).toBe(table[50]);
    expect(funtikovCoefficient(50.5, table)).toBe(table[50]);
    expect(funtikovCoefficient(99, table)).toBe(table[99]);
    expect(funtikovCoefficient(99.9, table)).toBe(table[99]);
    expect(funtikovCoefficient(100, table)).toBe(table[100]);
    expect(table[100]).toBe(25);
  });
});

describe('timeFactor', () => {
  it('повторяет пороги xlsm', () => {
    expect(timeFactor(44.9, project.metrics)).toBe(0.5);
    expect(timeFactor(45, project.metrics)).toBe(0.8);
    expect(timeFactor(54.9, project.metrics)).toBe(0.8);
    expect(timeFactor(55, project.metrics)).toBe(0.9);
    expect(timeFactor(64.9, project.metrics)).toBe(0.9);
    expect(timeFactor(65, project.metrics)).toBe(1);
    expect(timeFactor(74.9, project.metrics)).toBe(1);
    expect(timeFactor(75, project.metrics)).toBe(1.1);
    expect(timeFactor(84.9, project.metrics)).toBe(1.1);
    expect(timeFactor(85, project.metrics)).toBe(1.2);
  });
});

describe('impactFactor', () => {
  it('повторяет границы D', () => {
    expect(impactFactor(0.4, project.metrics)).toBe(1.5);
    expect(impactFactor(0.5, project.metrics)).toBe(3);
    expect(impactFactor(0.8, project.metrics)).toBe(6);
  });
});
