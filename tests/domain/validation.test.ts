import { describe, expect, it } from 'vitest';
import { createSeedProject } from '../../src/domain/seed';
import { hasBlockingErrors, validateProject } from '../../src/domain/validation';

describe('validateProject', () => {
  it('не находит ошибок в шаблоне', () => {
    const issues = validateProject(createSeedProject());
    expect(issues.filter((i) => i.severity === 'error')).toEqual([]);
  });

  it('предупреждает о пустом 1ПМ', () => {
    const project = createSeedProject();
    project.exercises[0].oneRM = null;
    const issues = validateProject(project);
    expect(issues.some((i) => i.code === 'NO_ONE_RM' && i.exerciseId === project.exercises[0].id)).toBe(true);
  });

  it('считает процент вне диапазона ошибкой', () => {
    const project = createSeedProject();
    project.weeks[0].days[0].entries[0].groups[0].percent = 101;
    const issues = validateProject(project);
    expect(issues.some((i) => i.code === 'INVALID_PERCENT')).toBe(true);
    expect(hasBlockingErrors(issues)).toBe(true);
  });

  it('ловит ссылку на несуществующее упражнение', () => {
    const project = createSeedProject();
    project.weeks[0].days[0].entries[0].exerciseId = 'missing';
    const issues = validateProject(project);
    expect(issues.some((i) => i.code === 'UNKNOWN_EXERCISE')).toBe(true);
  });

  it('предупреждает о пустом дне и пустой неделе', () => {
    const project = createSeedProject();
    project.weeks[0].days[0].entries = [];
    const issues = validateProject(project);
    expect(issues.some((i) => i.code === 'EMPTY_DAY')).toBe(true);
  });
});
