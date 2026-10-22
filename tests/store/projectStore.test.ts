import { beforeEach, describe, expect, it } from 'vitest';
import { createSeedProject } from '../../src/domain/seed';
import { useProjectStore } from '../../src/store/projectStore';

beforeEach(() => {
  localStorage.clear();
  useProjectStore.setState({ project: createSeedProject() });
});

describe('projectStore hydration', () => {
  it('падает обратно на шаблон, если сохранённый проект битый', async () => {
    localStorage.setItem(
      'cycle-builder.project.v1',
      JSON.stringify({ state: { project: { schemaVersion: 1 } }, version: 1 }),
    );
    await useProjectStore.persist.rehydrate();
    expect(useProjectStore.getState().project.weeks).toHaveLength(12);
  });
});
