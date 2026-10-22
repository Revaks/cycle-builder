import { beforeEach, describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ProgramPage from '../../src/pages/ProgramPage';
import { useProjectStore } from '../../src/store/projectStore';
import { createSeedProject } from '../../src/domain/seed';

beforeEach(() => {
  useProjectStore.setState({ project: createSeedProject() });
});

describe('ProgramPage', () => {
  it('показывает веса шаблона', () => {
    render(<ProgramPage />);
    expect(screen.getByText('Жим стоя')).toBeInTheDocument();
    expect(screen.getAllByText('32.5 кг').length).toBeGreaterThan(0);
  });

  it('отмечает неделю разгрузочной', async () => {
    const user = userEvent.setup();
    render(<ProgramPage />);
    const checkbox = screen.getByLabelText('Разгрузочная неделя');
    expect(checkbox).not.toBeChecked();
    await user.click(checkbox);
    expect(useProjectStore.getState().project.weeks[0].isDeload).toBe(true);
  });

  it('показывает ошибку рядом со строкой упражнения', () => {
    const project = createSeedProject();
    project.weeks[0].days[0].entries[0].groups[0].percent = 101;
    useProjectStore.setState({ project });
    render(<ProgramPage />);
    expect(screen.getByLabelText('Ошибок в строке: 1')).toBeInTheDocument();
  });

  it('пересчитывает вес при изменении процента', async () => {
    const user = userEvent.setup();
    render(<ProgramPage />);
    await user.click(screen.getByLabelText('Группа 1 упражнения Жим стоя'));
    const input = screen.getByLabelText('Процент группы 1');
    await user.clear(input);
    await user.type(input, '40');
    expect(screen.getAllByText('37.5 кг').length).toBeGreaterThan(0);
  });
});
