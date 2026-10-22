import { newId } from '../domain/ids';
import type {
  Entry,
  Exercise,
  MetricsConfig,
  Project,
  ProgressionConfig,
  RoundingMode,
  SetGroup,
  Week,
} from '../domain/types';

export interface NewExerciseInput {
  name: string;
  oneRM: number | null;
  impact: number;
  multiplier: number;
  rounding?: RoundingMode;
  note?: string;
}

export interface WavePayload {
  weekIds: string[];
  exerciseIds: string[];
  mode: 'linear' | 'wave' | 'constant';
  startPercent: number;
  stepPercent: number;
}

function clone(project: Project): Project {
  return structuredClone(project);
}

function touch(project: Project): Project {
  return { ...project, updatedAt: new Date().toISOString() };
}

function defaultGroup(): SetGroup {
  return { id: newId('group'), percent: 60, reps: 10, sets: 3 };
}

function clampPercent(value: number): number {
  return Math.max(0, Math.min(100, Math.round(value * 100) / 100));
}

export function renameProject(project: Project, name: string): Project {
  return touch({ ...project, name });
}

export function setProgression(project: Project, progression: ProgressionConfig): Project {
  return touch({ ...project, progression });
}

export function setDefaultRounding(project: Project, rounding: RoundingMode): Project {
  return touch({ ...project, defaultRounding: rounding });
}

export function setMetrics(project: Project, metrics: MetricsConfig): Project {
  return touch({ ...project, metrics });
}

export function addExercise(project: Project, input: NewExerciseInput): Project {
  const next = clone(project);
  const exercise: Exercise = {
    id: newId('ex'),
    name: input.name,
    oneRM: input.oneRM,
    impact: input.impact,
    multiplier: input.multiplier,
    rounding: input.rounding ?? next.defaultRounding,
    note: input.note,
  };
  next.exercises.push(exercise);
  return touch(next);
}

export function updateExercise(
  project: Project,
  id: string,
  patch: Partial<Omit<Exercise, 'id'>>,
): Project {
  const next = clone(project);
  next.exercises = next.exercises.map((exercise) =>
    exercise.id === id ? { ...exercise, ...patch, id } : exercise,
  );
  return touch(next);
}

export function removeExercise(project: Project, id: string): Project {
  const next = clone(project);
  next.exercises = next.exercises.filter((exercise) => exercise.id !== id);
  for (const week of next.weeks) {
    for (const day of week.days) {
      day.entries = day.entries.filter((entry) => entry.exerciseId !== id);
    }
  }
  return touch(next);
}

export function addDayTemplate(project: Project, name: string): Project {
  const next = clone(project);
  const id = newId('day');
  next.dayTemplates.push({ id, name });
  for (const week of next.weeks) {
    week.days.push({ dayTemplateId: id, entries: [] });
  }
  return touch(next);
}

export function renameDayTemplate(project: Project, id: string, name: string): Project {
  const next = clone(project);
  next.dayTemplates = next.dayTemplates.map((day) =>
    day.id === id ? { ...day, name } : day,
  );
  return touch(next);
}

export function removeDayTemplate(project: Project, id: string): Project {
  const next = clone(project);
  next.dayTemplates = next.dayTemplates.filter((day) => day.id !== id);
  for (const week of next.weeks) {
    week.days = week.days.filter((day) => day.dayTemplateId !== id);
  }
  return touch(next);
}

export function moveDayTemplate(
  project: Project,
  id: string,
  direction: -1 | 1,
): Project {
  const next = clone(project);
  const index = next.dayTemplates.findIndex((day) => day.id === id);
  const target = index + direction;
  if (index < 0 || target < 0 || target >= next.dayTemplates.length) return project;
  [next.dayTemplates[index], next.dayTemplates[target]] = [
    next.dayTemplates[target],
    next.dayTemplates[index],
  ];
  const order = new Map(next.dayTemplates.map((day, position) => [day.id, position]));
  for (const week of next.weeks) {
    week.days.sort(
      (a, b) => (order.get(a.dayTemplateId) ?? 0) - (order.get(b.dayTemplateId) ?? 0),
    );
  }
  return touch(next);
}

function normalizeWeekLabels(project: Project): void {
  project.weeks.forEach((week, index) => {
    week.label = `Неделя ${index + 1}`;
  });
}

function createEmptyWeek(project: Project): Week {
  return {
    id: newId('week'),
    label: `Неделя ${project.weeks.length + 1}`,
    isDeload: false,
    days: project.dayTemplates.map((day) => ({ dayTemplateId: day.id, entries: [] })),
  };
}

export function addWeek(project: Project, copyFromWeekId?: string): Project {
  if (copyFromWeekId) return duplicateWeek(project, copyFromWeekId);
  const next = clone(project);
  next.weeks.push(createEmptyWeek(next));
  normalizeWeekLabels(next);
  return touch(next);
}

export function duplicateWeek(project: Project, weekId: string): Project {
  const next = clone(project);
  const index = next.weeks.findIndex((week) => week.id === weekId);
  if (index < 0) return project;
  const source = next.weeks[index];
  const copy: Week = {
    id: newId('week'),
    label: '',
    isDeload: source.isDeload,
    days: source.days.map((day) => ({
      dayTemplateId: day.dayTemplateId,
      entries: day.entries.map((entry) => ({
        id: newId('entry'),
        exerciseId: entry.exerciseId,
        groups: entry.groups.map((group) => ({ ...group, id: newId('group') })),
      })),
    })),
  };
  next.weeks.splice(index + 1, 0, copy);
  normalizeWeekLabels(next);
  return touch(next);
}

export function removeWeek(project: Project, weekId: string): Project {
  const next = clone(project);
  next.weeks = next.weeks.filter((week) => week.id !== weekId);
  normalizeWeekLabels(next);
  return touch(next);
}

export function moveWeek(project: Project, weekId: string, direction: -1 | 1): Project {
  const next = clone(project);
  const index = next.weeks.findIndex((week) => week.id === weekId);
  const target = index + direction;
  if (index < 0 || target < 0 || target >= next.weeks.length) return project;
  [next.weeks[index], next.weeks[target]] = [next.weeks[target], next.weeks[index]];
  normalizeWeekLabels(next);
  return touch(next);
}

export function setWeekDeload(project: Project, weekId: string, value: boolean): Project {
  const next = clone(project);
  next.weeks = next.weeks.map((week) =>
    week.id === weekId ? { ...week, isDeload: value } : week,
  );
  return touch(next);
}

function addEntryToWeek(
  week: Week,
  dayTemplateId: string,
  exerciseId: string,
): boolean {
  const day = week.days.find((item) => item.dayTemplateId === dayTemplateId);
  if (!day) return false;
  if (day.entries.some((entry) => entry.exerciseId === exerciseId)) return false;
  const entry: Entry = {
    id: newId('entry'),
    exerciseId,
    groups: [defaultGroup()],
  };
  day.entries.push(entry);
  return true;
}

export function addEntry(
  project: Project,
  weekId: string,
  dayTemplateId: string,
  exerciseId: string,
  scope: 'week' | 'all',
): Project {
  const next = clone(project);
  const weeks = scope === 'all' ? next.weeks : next.weeks.filter((week) => week.id === weekId);
  for (const week of weeks) {
    addEntryToWeek(week, dayTemplateId, exerciseId);
  }
  return touch(next);
}

export function removeEntry(
  project: Project,
  weekId: string,
  dayTemplateId: string,
  entryId: string,
  scope: 'week' | 'all',
): Project {
  const next = clone(project);
  const targetWeek = next.weeks.find((week) => week.id === weekId);
  const targetDay = targetWeek?.days.find((day) => day.dayTemplateId === dayTemplateId);
  const targetEntry = targetDay?.entries.find((entry) => entry.id === entryId);
  if (!targetEntry) return project;

  const weeks = scope === 'all' ? next.weeks : targetWeek ? [targetWeek] : [];
  for (const week of weeks) {
    const day = week.days.find((item) => item.dayTemplateId === dayTemplateId);
    if (!day) continue;
    day.entries =
      scope === 'all'
        ? day.entries.filter((entry) => entry.exerciseId !== targetEntry.exerciseId)
        : day.entries.filter((entry) => entry.id !== entryId);
  }
  return touch(next);
}

export function moveEntry(
  project: Project,
  weekId: string,
  dayTemplateId: string,
  entryId: string,
  direction: -1 | 1,
): Project {
  const next = clone(project);
  const week = next.weeks.find((item) => item.id === weekId);
  const day = week?.days.find((item) => item.dayTemplateId === dayTemplateId);
  if (!day) return project;
  const index = day.entries.findIndex((entry) => entry.id === entryId);
  const target = index + direction;
  if (index < 0 || target < 0 || target >= day.entries.length) return project;
  [day.entries[index], day.entries[target]] = [day.entries[target], day.entries[index]];
  return touch(next);
}

export function addGroup(
  project: Project,
  weekId: string,
  dayTemplateId: string,
  entryId: string,
): Project {
  const next = clone(project);
  const entry = findEntry(next, weekId, dayTemplateId, entryId);
  if (!entry) return project;
  entry.groups.push(defaultGroup());
  return touch(next);
}

export function updateGroup(
  project: Project,
  weekId: string,
  dayTemplateId: string,
  entryId: string,
  groupId: string,
  patch: Partial<Pick<SetGroup, 'percent' | 'reps' | 'sets'>>,
): Project {
  const next = clone(project);
  const entry = findEntry(next, weekId, dayTemplateId, entryId);
  if (!entry) return project;
  entry.groups = entry.groups.map((group) =>
    group.id === groupId ? { ...group, ...patch, id: groupId } : group,
  );
  return touch(next);
}

export function removeGroup(
  project: Project,
  weekId: string,
  dayTemplateId: string,
  entryId: string,
  groupId: string,
): Project {
  const next = clone(project);
  const entry = findEntry(next, weekId, dayTemplateId, entryId);
  if (!entry) return project;
  entry.groups = entry.groups.filter((group) => group.id !== groupId);
  return touch(next);
}

function findEntry(
  project: Project,
  weekId: string,
  dayTemplateId: string,
  entryId: string,
): Entry | undefined {
  const week = project.weeks.find((item) => item.id === weekId);
  const day = week?.days.find((item) => item.dayTemplateId === dayTemplateId);
  return day?.entries.find((entry) => entry.id === entryId);
}

export function waveTargetPercent(
  mode: WavePayload['mode'],
  startPercent: number,
  stepPercent: number,
  index: number,
): number {
  const wavePattern = [0, 1, -1];
  if (mode === 'linear') return startPercent + stepPercent * index;
  if (mode === 'constant') return startPercent;
  return startPercent + stepPercent * wavePattern[index % 3];
}

export function applyWave(project: Project, payload: WavePayload): Project {
  const next = clone(project);
  const exerciseIds = new Set(payload.exerciseIds);

  payload.weekIds.forEach((weekId, index) => {
    const week = next.weeks.find((item) => item.id === weekId);
    if (!week) return;

    const target = clampPercent(
      waveTargetPercent(payload.mode, payload.startPercent, payload.stepPercent, index),
    );

    for (const day of week.days) {
      for (const entry of day.entries) {
        if (!exerciseIds.has(entry.exerciseId) || entry.groups.length === 0) continue;
        const currentTop = entry.groups[entry.groups.length - 1].percent;
        const delta = target - currentTop;
        entry.groups = entry.groups.map((group) => ({
          ...group,
          percent: clampPercent(group.percent + delta),
        }));
      }
    }
  });

  return touch(next);
}
