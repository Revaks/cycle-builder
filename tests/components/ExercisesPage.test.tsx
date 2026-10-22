import { beforeEach, describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ExercisesPage from '../../src/pages/ExercisesPage';
import { createSeedProject } from '../../src/domain/seed';
import { useProjectStore } from '../../src/store/projectStore';

beforeEach(() => {
  useProjectStore.setState({ project: createSeedProject() });
});

describe('ExercisesPage', () => {
  it('меняет 1ПМ упражнения', async () => {
    const user = userEvent.setup();
    render(<ExercisesPage />);
    const input = screen.getByLabelText('1ПМ Жим стоя');
    await user.clear(input);
    await user.type(input, '100');
    const press = useProjectStore
      .getState()
      .project.exercises.find((exercise) => exercise.name === 'Жим стоя');
    expect(press?.oneRM).toBe(100);
  });
});
