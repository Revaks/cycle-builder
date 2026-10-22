import { funtikovCoefficient, impactFactor, timeFactor } from './metrics';
import { effectiveOneRM } from './progression';
import { mround, resolveStep } from './rounding';
import type {
  ComputedCycle,
  ComputedDay,
  ComputedEntry,
  ComputedGroup,
  ComputedWeek,
  Entry,
  Exercise,
  MetricsConfig,
  Project,
  WeekDay,
} from './types';

export function calculateEntry(
  entry: Entry,
  exercise: Exercise,
  oneRM: number | null,
  metrics: MetricsConfig,
): ComputedEntry {
  const groups: ComputedGroup[] = entry.groups.map((group) => {
    const percent = group.percent;
    const weight =
      percent === 0
        ? 0
        : oneRM === null
          ? null
          : mround((oneRM * percent) / 100, resolveStep(oneRM, exercise.rounding));
    const reps = group.reps;
    const sets = group.sets;
    const kpsh = reps * sets;
    const tonnage = weight === null ? null : weight * reps * sets * exercise.multiplier;
    const funtikov =
      weight === null
        ? null
        : weight *
          reps *
          sets *
          funtikovCoefficient(percent, metrics.funtikovTable) *
          exercise.multiplier *
          exercise.impact;
    const timeMinutes = sets * timeFactor(percent, metrics) * impactFactor(exercise.impact, metrics);

    return {
      ...group,
      weight,
      tonnage,
      kpsh,
      funtikov,
      timeMinutes,
    };
  });

  const tonnage = groups.reduce((sum, group) => sum + (group.tonnage ?? 0), 0);
  const kpsh = groups.reduce((sum, group) => sum + group.kpsh, 0);
  const funtikov = groups.reduce((sum, group) => sum + (group.funtikov ?? 0), 0);
  const timeMinutes = groups.reduce((sum, group) => sum + group.timeMinutes, 0);
  const avgWeight = kpsh > 0 ? tonnage / kpsh : 0;
  const relativeIntensity =
    oneRM === null || exercise.multiplier <= 0
      ? null
      : avgWeight / (oneRM * exercise.multiplier);

  return {
    entryId: entry.id,
    exercise,
    oneRM,
    groups,
    tonnage,
    kpsh,
    funtikov,
    timeMinutes,
    avgWeight,
    relativeIntensity,
    hasMissingOneRM: oneRM === null,
  };
}

function calculateDay(
  weekDay: WeekDay,
  oneRMByExercise: Record<string, number | null>,
  project: Project,
  dayName: string,
): ComputedDay {
  const entries = weekDay.entries
    .map((entry) => {
      const exercise = project.exercises.find((item) => item.id === entry.exerciseId);
      if (!exercise) return null;
      return calculateEntry(entry, exercise, oneRMByExercise[exercise.id] ?? null, project.metrics);
    })
    .filter((entry): entry is ComputedEntry => entry !== null);

  const tonnage = entries.reduce((sum, entry) => sum + entry.tonnage, 0);
  const kpsh = entries.reduce((sum, entry) => sum + entry.kpsh, 0);
  const funtikov = entries.reduce((sum, entry) => sum + entry.funtikov, 0);
  const rawTime = entries.reduce((sum, entry) => sum + entry.timeMinutes, 0);

  return {
    dayTemplateId: weekDay.dayTemplateId,
    dayName,
    entries,
    tonnage,
    kpsh,
    funtikov,
    timeMinutes: rawTime === 0 ? 0 : Math.floor(rawTime + 30),
    avgWeight: kpsh > 0 ? tonnage / kpsh : 0,
  };
}

export function calculateCycle(project: Project): ComputedCycle {
  const weeks: ComputedWeek[] = project.weeks.map((week, weekIndex) => {
    const oneRMByExercise: Record<string, number | null> = {};
    for (const exercise of project.exercises) {
      oneRMByExercise[exercise.id] =
        exercise.oneRM === null
          ? null
          : effectiveOneRM(
              exercise.oneRM,
              weekIndex + 1,
              project.progression,
              week.isDeload,
            );
    }

    const days = week.days.map((weekDay) => {
      const dayTemplate = project.dayTemplates.find((day) => day.id === weekDay.dayTemplateId);
      return calculateDay(
        weekDay,
        oneRMByExercise,
        project,
        dayTemplate?.name ?? weekDay.dayTemplateId,
      );
    });

    const tonnage = days.reduce((sum, day) => sum + day.tonnage, 0);
    const kpsh = days.reduce((sum, day) => sum + day.kpsh, 0);
    const funtikov = days.reduce((sum, day) => sum + day.funtikov, 0);
    const timeMinutes = days.reduce((sum, day) => sum + day.timeMinutes, 0);

    return {
      weekId: week.id,
      label: week.label,
      isDeload: week.isDeload,
      oneRMByExercise,
      days,
      tonnage,
      kpsh,
      funtikov,
      timeMinutes,
      avgWeight: kpsh > 0 ? tonnage / kpsh : 0,
    };
  });

  const tonnage = weeks.reduce((sum, week) => sum + week.tonnage, 0);
  const kpsh = weeks.reduce((sum, week) => sum + week.kpsh, 0);
  const funtikov = weeks.reduce((sum, week) => sum + week.funtikov, 0);
  const timeMinutes = weeks.reduce((sum, week) => sum + week.timeMinutes, 0);

  return {
    weeks,
    tonnage,
    kpsh,
    funtikov,
    timeMinutes,
    avgWeight: kpsh > 0 ? tonnage / kpsh : 0,
  };
}
