import { describe, expect, it } from 'vitest';
import { createSeedProject } from '../../src/domain/seed';
import { parseProjectJson, serializeProject } from '../../src/domain/validation';

describe('project JSON', () => {
  it('делает round-trip', () => {
    const project = createSeedProject();
    const parsed = parseProjectJson(serializeProject(project));
    expect(parsed.ok).toBe(true);
    if (parsed.ok) expect(parsed.project).toEqual(project);
  });

  it('отклоняет битый JSON', () => {
    expect(parseProjectJson('{').ok).toBe(false);
  });

  it('отклоняет чужую версию', () => {
    const project = { ...createSeedProject(), schemaVersion: 2 };
    const parsed = parseProjectJson(JSON.stringify(project));
    expect(parsed.ok).toBe(false);
    if (!parsed.ok) expect(parsed.error).toContain('2');
  });

  it('отклоняет битую ссылку', () => {
    const project = createSeedProject();
    project.weeks[0].days[0].entries[0].exerciseId = 'missing';
    expect(parseProjectJson(JSON.stringify(project)).ok).toBe(false);
  });
});
