// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { buildWorkbook } from '../../src/export/excel';
import { calculateCycle } from '../../src/domain/calculate';
import { createSeedProject } from '../../src/domain/seed';
import { duplicateWeek } from '../../src/store/projectActions';

describe('buildWorkbook', () => {
  it('создаёт сводку и листы недель', async () => {
    const project = createSeedProject();
    const wb = await buildWorkbook(project, calculateCycle(project));
    expect(wb.worksheets.map((w) => w.name)).toEqual([
      'Сводка',
      ...project.weeks.map((_, i) => `Неделя ${i + 1}`),
    ]);
    const summary = wb.getWorksheet('Сводка')!;
    expect(summary.rowCount).toBe(project.weeks.length + 2);
    expect(summary.getCell(`A${project.weeks.length + 2}`).value).toBe('Итого');
    const week = wb.getWorksheet('Неделя 1')!;
    expect(week.getCell('A1').value).toContain('Неделя 1');
    expect(week.getCell('A2').value).toBe('День');
    expect(week.getCell('B2').value).toBe('Упражнение');
    expect(week.getCell('F2').value).toBe('Вес');
  });

  it('не падает на повторяющихся названиях недель', async () => {
    const project = duplicateWeek(createSeedProject(), 'week-1');
    const wb = await buildWorkbook(project, calculateCycle(project));
    const names = wb.worksheets.map((w) => w.name);
    expect(new Set(names).size).toBe(names.length);
  });
});
