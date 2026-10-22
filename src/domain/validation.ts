import type { Issue, Project } from './types';

type UnknownRecord = Record<string, unknown>;

function isRecord(value: unknown): value is UnknownRecord {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isString(value: unknown): value is string {
  return typeof value === 'string';
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value);
}

function isBoolean(value: unknown): value is boolean {
  return typeof value === 'boolean';
}

function isRoundingMode(value: unknown): boolean {
  return value === 'auto' || (isFiniteNumber(value) && value > 0);
}

function isExerciseShape(value: unknown): boolean {
  if (!isRecord(value)) return false;
  return (
    isString(value.id) &&
    isString(value.name) &&
    (value.oneRM === null || isFiniteNumber(value.oneRM)) &&
    isFiniteNumber(value.impact) &&
    isFiniteNumber(value.multiplier) &&
    isRoundingMode(value.rounding) &&
    (value.note === undefined || isString(value.note))
  );
}

function isDayTemplateShape(value: unknown): boolean {
  return isRecord(value) && isString(value.id) && isString(value.name);
}

function isGroupShape(value: unknown): boolean {
  return (
    isRecord(value) &&
    isString(value.id) &&
    isFiniteNumber(value.percent) &&
    isFiniteNumber(value.reps) &&
    isFiniteNumber(value.sets)
  );
}

function isEntryShape(value: unknown): boolean {
  return (
    isRecord(value) &&
    isString(value.id) &&
    isString(value.exerciseId) &&
    Array.isArray(value.groups) &&
    value.groups.every(isGroupShape)
  );
}

function isWeekDayShape(value: unknown): boolean {
  return (
    isRecord(value) &&
    isString(value.dayTemplateId) &&
    Array.isArray(value.entries) &&
    value.entries.every(isEntryShape)
  );
}

function isWeekShape(value: unknown): boolean {
  return (
    isRecord(value) &&
    isString(value.id) &&
    isString(value.label) &&
    isBoolean(value.isDeload) &&
    Array.isArray(value.days) &&
    value.days.every(isWeekDayShape)
  );
}

function isProgressionShape(value: unknown): boolean {
  if (!isRecord(value)) return false;
  const deload = value.deload;
  return (
    (value.mode === 'compound' || value.mode === 'linear' || value.mode === 'none') &&
    isFiniteNumber(value.stepPercent) &&
    isRecord(deload) &&
    (deload.mode === 'hold' || deload.mode === 'reduce') &&
    isFiniteNumber(deload.reductionPercent)
  );
}

function isMetricsShape(value: unknown): boolean {
  if (!isRecord(value)) return false;
  return (
    Array.isArray(value.funtikovTable) &&
    value.funtikovTable.every(isFiniteNumber) &&
    Array.isArray(value.timeThresholds) &&
    value.timeThresholds.every(
      (item) =>
        isRecord(item) &&
        isFiniteNumber(item.belowPercent) &&
        isFiniteNumber(item.factor),
    ) &&
    isFiniteNumber(value.timeFallbackFactor) &&
    isFiniteNumber(value.impactHeavyThreshold) &&
    isFiniteNumber(value.impactLightThreshold) &&
    isFiniteNumber(value.impactHeavyFactor) &&
    isFiniteNumber(value.impactMediumFactor) &&
    isFiniteNumber(value.impactLightFactor)
  );
}

export function isProjectShape(value: unknown): value is Project {
  if (!isRecord(value)) return false;
  return (
    value.schemaVersion === 1 &&
    isString(value.id) &&
    isString(value.name) &&
    isString(value.createdAt) &&
    isString(value.updatedAt) &&
    value.unit === 'kg' &&
    isRoundingMode(value.defaultRounding) &&
    Array.isArray(value.exercises) &&
    value.exercises.every(isExerciseShape) &&
    Array.isArray(value.dayTemplates) &&
    value.dayTemplates.every(isDayTemplateShape) &&
    Array.isArray(value.weeks) &&
    value.weeks.every(isWeekShape) &&
    isProgressionShape(value.progression) &&
    isMetricsShape(value.metrics)
  );
}

export function hasBlockingErrors(issues: Issue[]): boolean {
  return issues.some((issue) => issue.severity === 'error');
}

export function validateProject(project: Project): Issue[] {
  const issues: Issue[] = [];

  if (!Array.isArray(project.exercises)) {
    issues.push({ severity: 'error', code: 'INVALID_PROJECT', message: 'Список упражнений отсутствует' });
    return issues;
  }
  if (!Array.isArray(project.dayTemplates)) {
    issues.push({ severity: 'error', code: 'INVALID_PROJECT', message: 'Список дней отсутствует' });
    return issues;
  }
  if (!Array.isArray(project.weeks)) {
    issues.push({ severity: 'error', code: 'INVALID_PROJECT', message: 'Список недель отсутствует' });
    return issues;
  }
  if (project.weeks.length === 0) {
    issues.push({ severity: 'error', code: 'NO_WEEKS', message: 'В цикле нет ни одной недели' });
  }
  if (project.dayTemplates.length === 0) {
    issues.push({ severity: 'error', code: 'NO_DAY_TEMPLATES', message: 'В цикле нет ни одного дня' });
  }

  const exerciseIds = new Set<string>();
  const dayIds = new Set<string>();
  const exerciseNames = new Map<string, string>();
  const exerciseNamesById = new Map(project.exercises.map((exercise) => [exercise.id, exercise.name]));
  const dayNamesById = new Map(project.dayTemplates.map((day) => [day.id, day.name]));

  for (const exercise of project.exercises) {
    if (exerciseIds.has(exercise.id)) {
      issues.push({
        severity: 'error',
        code: 'DUPLICATE_EXERCISE_ID',
        message: `Упражнение «${exercise.name}» имеет повторяющийся ID`,
        exerciseId: exercise.id,
      });
    }
    exerciseIds.add(exercise.id);

    const normalizedName = exercise.name.trim().toLowerCase();
    if (exerciseNames.has(normalizedName)) {
      issues.push({
        severity: 'warning',
        code: 'DUPLICATE_EXERCISE_NAME',
        message: `Название «${exercise.name}» повторяется`,
        exerciseId: exercise.id,
      });
    }
    exerciseNames.set(normalizedName, exercise.id);

    if (exercise.oneRM === null) {
      issues.push({
        severity: 'warning',
        code: 'NO_ONE_RM',
        message: `У упражнения «${exercise.name}» не задан 1ПМ`,
        exerciseId: exercise.id,
      });
    } else if (!isFiniteNumber(exercise.oneRM) || exercise.oneRM <= 0) {
      issues.push({
        severity: 'error',
        code: 'INVALID_ONE_RM',
        message: `У упражнения «${exercise.name}» 1ПМ должен быть больше нуля`,
        exerciseId: exercise.id,
      });
    }

    if (!isFiniteNumber(exercise.impact) || exercise.impact <= 0) {
      issues.push({
        severity: 'error',
        code: 'INVALID_IMPACT',
        message: `У упражнения «${exercise.name}» коэффициент D должен быть больше нуля`,
        exerciseId: exercise.id,
      });
    }
    if (!isFiniteNumber(exercise.multiplier) || exercise.multiplier <= 0) {
      issues.push({
        severity: 'error',
        code: 'INVALID_MULTIPLIER',
        message: `У упражнения «${exercise.name}» множитель E должен быть больше нуля`,
        exerciseId: exercise.id,
      });
    }
    if (!isRoundingMode(exercise.rounding)) {
      issues.push({
        severity: 'error',
        code: 'INVALID_ROUNDING',
        message: `У упражнения «${exercise.name}» некорректный шаг округления`,
        exerciseId: exercise.id,
      });
    }
  }

  for (const day of project.dayTemplates) {
    if (dayIds.has(day.id)) {
      issues.push({
        severity: 'error',
        code: 'DUPLICATE_DAY',
        message: `День «${day.name}» имеет повторяющийся ID`,
        dayTemplateId: day.id,
      });
    }
    dayIds.add(day.id);
  }

  if (project.dayTemplates.length > 7) {
    issues.push({
      severity: 'warning',
      code: 'TOO_MANY_DAYS',
      message: 'В цикле больше 7 дней — проверьте структуру',
    });
  }
  if (project.weeks.length > 52) {
    issues.push({
      severity: 'warning',
      code: 'TOO_MANY_WEEKS',
      message: 'В цикле больше 52 недель — проверьте длину',
    });
  }

  const usedExerciseIds = new Set<string>();

  for (const week of project.weeks) {
    const weekDayIds = new Set<string>();
    let weekHasEntries = false;

    for (const day of week.days) {
      if (!dayIds.has(day.dayTemplateId)) {
        issues.push({
          severity: 'error',
          code: 'UNKNOWN_DAY_TEMPLATE',
          message: `В неделе «${week.label}» есть день с неизвестным ID`,
          weekId: week.id,
          dayTemplateId: day.dayTemplateId,
        });
      }
      if (weekDayIds.has(day.dayTemplateId)) {
        issues.push({
          severity: 'error',
          code: 'DUPLICATE_DAY',
          message: `В неделе «${week.label}» день повторяется`,
          weekId: week.id,
          dayTemplateId: day.dayTemplateId,
        });
      }
      weekDayIds.add(day.dayTemplateId);

      if (day.entries.length === 0) {
        issues.push({
          severity: 'warning',
          code: 'EMPTY_DAY',
          message: `В неделе «${week.label}» день без упражнений`,
          weekId: week.id,
          dayTemplateId: day.dayTemplateId,
        });
      } else {
        weekHasEntries = true;
      }

      if (day.entries.length > 20) {
        issues.push({
          severity: 'warning',
          code: 'TOO_MANY_ENTRIES',
          message: `В дне недели «${week.label}» больше 20 упражнений`,
          weekId: week.id,
          dayTemplateId: day.dayTemplateId,
        });
      }

      const dayExerciseIds = new Set<string>();
      for (const entry of day.entries) {
        if (!exerciseIds.has(entry.exerciseId)) {
          issues.push({
            severity: 'error',
            code: 'UNKNOWN_EXERCISE',
            message: `В неделе «${week.label}» есть ссылка на несуществующее упражнение`,
            weekId: week.id,
            dayTemplateId: day.dayTemplateId,
            entryId: entry.id,
            exerciseId: entry.exerciseId,
          });
        } else {
          usedExerciseIds.add(entry.exerciseId);
        }

        if (dayExerciseIds.has(entry.exerciseId)) {
          issues.push({
            severity: 'warning',
            code: 'DUPLICATE_EXERCISE_IN_DAY',
            message: `В дне недели «${week.label}» упражнение повторяется`,
            weekId: week.id,
            dayTemplateId: day.dayTemplateId,
            entryId: entry.id,
            exerciseId: entry.exerciseId,
          });
        }
        dayExerciseIds.add(entry.exerciseId);

        if (entry.groups.length > 12) {
          issues.push({
            severity: 'warning',
            code: 'TOO_MANY_GROUPS',
            message: `В упражнении недели «${week.label}» больше 12 групп`,
            weekId: week.id,
            dayTemplateId: day.dayTemplateId,
            entryId: entry.id,
          });
        }

        const context = `«${exerciseNamesById.get(entry.exerciseId) ?? 'Упражнение'}», ${dayNamesById.get(day.dayTemplateId) ?? day.dayTemplateId}`;

        for (const group of entry.groups) {
          if (!isFiniteNumber(group.percent) || group.percent < 0 || group.percent > 100) {
            issues.push({
              severity: 'error',
              code: 'INVALID_PERCENT',
              message: `${context}: процент должен быть в диапазоне 0–100`,
              weekId: week.id,
              dayTemplateId: day.dayTemplateId,
              entryId: entry.id,
              groupId: group.id,
            });
          }
          if (!Number.isInteger(group.reps) || group.reps < 1) {
            issues.push({
              severity: 'error',
              code: 'INVALID_REPS',
              message: `${context}: повторы должны быть целым числом больше нуля`,
              weekId: week.id,
              dayTemplateId: day.dayTemplateId,
              entryId: entry.id,
              groupId: group.id,
            });
          }
          if (!Number.isInteger(group.sets) || group.sets < 1) {
            issues.push({
              severity: 'error',
              code: 'INVALID_SETS',
              message: `${context}: подходы должны быть целым числом больше нуля`,
              weekId: week.id,
              dayTemplateId: day.dayTemplateId,
              entryId: entry.id,
              groupId: group.id,
            });
          }
        }
      }
    }

    if (!weekHasEntries) {
      issues.push({
        severity: 'warning',
        code: 'EMPTY_WEEK',
        message: `Неделя «${week.label}» не содержит упражнений`,
        weekId: week.id,
      });
    }
  }

  for (const exercise of project.exercises) {
    if (!usedExerciseIds.has(exercise.id)) {
      issues.push({
        severity: 'warning',
        code: 'UNUSED_EXERCISE',
        message: `Упражнение «${exercise.name}» не используется в цикле`,
        exerciseId: exercise.id,
      });
    }
  }

  if (!isFiniteNumber(project.progression.stepPercent) || project.progression.stepPercent < 0) {
    issues.push({
      severity: 'error',
      code: 'INVALID_STEP',
      message: 'Шаг прогрессии не может быть отрицательным',
    });
  } else if (project.progression.stepPercent > 10) {
    issues.push({
      severity: 'warning',
      code: 'LARGE_STEP',
      message: 'Шаг прогрессии больше 10% — проверьте настройку',
    });
  }

  const deload = project.progression.deload;
  if (
    !isFiniteNumber(deload.reductionPercent) ||
    deload.reductionPercent < 0 ||
    deload.reductionPercent > 100
  ) {
    issues.push({
      severity: 'error',
      code: 'INVALID_DELOAD',
      message: 'Процент разгрузки должен быть в диапазоне 0–100',
    });
  }

  if (
    !Array.isArray(project.metrics.funtikovTable) ||
    project.metrics.funtikovTable.length !== 101 ||
    !project.metrics.funtikovTable.every(isFiniteNumber) ||
    project.metrics.funtikovTable.some((value) => value < 0)
  ) {
    issues.push({
      severity: 'error',
      code: 'INVALID_FUNTIKOV_TABLE',
      message: 'Таблица Фунтикова должна содержать 101 число',
    });
  }

  const thresholds = project.metrics.timeThresholds;
  const thresholdsValid =
    Array.isArray(thresholds) &&
    thresholds.every(
      (item) =>
        isFiniteNumber(item.belowPercent) &&
        item.belowPercent >= 0 &&
        item.belowPercent <= 100 &&
        isFiniteNumber(item.factor) &&
        item.factor >= 0,
    ) &&
    isFiniteNumber(project.metrics.timeFallbackFactor) &&
    project.metrics.timeFallbackFactor >= 0 &&
    thresholds.every(
      (item, index) => index === 0 || item.belowPercent > thresholds[index - 1].belowPercent,
    );
  if (!thresholdsValid) {
    issues.push({
      severity: 'error',
      code: 'INVALID_TIME_THRESHOLDS',
      message: 'Пороги времени должны возрастать, а факторы — быть неотрицательными числами',
    });
  }

  const impactValid =
    isFiniteNumber(project.metrics.impactHeavyThreshold) &&
    project.metrics.impactHeavyThreshold >= 0 &&
    isFiniteNumber(project.metrics.impactLightThreshold) &&
    project.metrics.impactLightThreshold >= 0 &&
    project.metrics.impactHeavyThreshold >= project.metrics.impactLightThreshold &&
    isFiniteNumber(project.metrics.impactHeavyFactor) &&
    project.metrics.impactHeavyFactor >= 0 &&
    isFiniteNumber(project.metrics.impactMediumFactor) &&
    project.metrics.impactMediumFactor >= 0 &&
    isFiniteNumber(project.metrics.impactLightFactor) &&
    project.metrics.impactLightFactor >= 0;
  if (!impactValid) {
    issues.push({
      severity: 'error',
      code: 'INVALID_IMPACT_FACTORS',
      message: 'Факторы воздействия должны быть неотрицательными, а тяжёлый порог — не меньше лёгкого',
    });
  }

  return issues;
}

export function serializeProject(project: Project): string {
  return JSON.stringify(project, null, 2);
}

export function parseProjectJson(
  text: string,
): { ok: true; project: Project } | { ok: false; error: string } {
  let value: unknown;
  try {
    value = JSON.parse(text);
  } catch {
    return { ok: false, error: 'Файл не является корректным JSON' };
  }

  if (isRecord(value) && 'schemaVersion' in value && value.schemaVersion !== 1) {
    return {
      ok: false,
      error: `Неподдерживаемая версия схемы: ${String(value.schemaVersion)}. Ожидается версия 1.`,
    };
  }

  if (!isProjectShape(value)) {
    return { ok: false, error: 'Файл не похож на проект конструктора цикла или имеет другую версию' };
  }

  const issues = validateProject(value);
  const firstError = issues.find((issue) => issue.severity === 'error');
  if (firstError) {
    return { ok: false, error: firstError.message };
  }

  return { ok: true, project: value };
}
