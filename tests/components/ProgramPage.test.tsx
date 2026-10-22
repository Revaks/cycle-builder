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
