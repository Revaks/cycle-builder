import { beforeEach, describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import StructureEditor from '../../src/components/StructureEditor';
import { createSeedProject } from '../../src/domain/seed';
import { useProjectStore } from '../../src/store/projectStore';

beforeEach(() => {
  useProjectStore.setState({ project: createSeedProject() });
});

describe('StructureEditor', () => {
  it('спрашивает подтверждение перед удалением упражнения из всех недель', async () => {
    const user = userEvent.setup();
    render(<StructureEditor weekId="week-1" />);

    await user.click(screen.getByLabelText('Убрать Жим стоя из всех недель'));
    expect(screen.getByRole('dialog')).toHaveTextContent('Жим стоя');
    await user.click(screen.getByRole('button', { name: 'Отмена' }));

    const stillPresent = useProjectStore
      .getState()
      .project.weeks.every((week) =>
        week.days.some((day) => day.entries.some((entry) => entry.exerciseId === 'ex-01')),
      );
    expect(stillPresent).toBe(true);
  });
});
