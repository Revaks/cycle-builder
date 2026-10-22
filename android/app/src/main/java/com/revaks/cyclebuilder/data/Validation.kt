package com.revaks.cyclebuilder.data

import kotlin.math.abs

fun validateProject(project: Project): List<Issue> {
    val issues = mutableListOf<Issue>()

    if (project.schemaVersion != 1) {
        issues += Issue(
            Severity.ERROR,
            "INVALID_SCHEMA",
            "Поддерживается только версия схемы 1",
        )
    }
    if (project.weeks.isEmpty()) {
        issues += Issue(Severity.ERROR, "NO_WEEKS", "В цикле нет ни одной недели")
    }
    if (project.dayTemplates.isEmpty()) {
        issues += Issue(Severity.ERROR, "NO_DAY_TEMPLATES", "В цикле нет ни одного дня")
    }

    val exerciseIds = mutableSetOf<String>()
    val exerciseNames = mutableMapOf<String, String>()
    val exerciseNamesById = project.exercises.associate { it.id to it.name }
    val dayNamesById = project.dayTemplates.associate { it.id to it.name }

    for (exercise in project.exercises) {
        if (!exerciseIds.add(exercise.id)) {
            issues += Issue(
                Severity.ERROR,
                "DUPLICATE_EXERCISE_ID",
                "Упражнение «${exercise.name}» имеет повторяющийся ID",
                exerciseId = exercise.id,
            )
        }
        val normalizedName = exercise.name.trim().lowercase()
        if (exerciseNames.containsKey(normalizedName)) {
            issues += Issue(
                Severity.WARNING,
                "DUPLICATE_EXERCISE_NAME",
                "Название «${exercise.name}» повторяется",
                exerciseId = exercise.id,
            )
        }
        exerciseNames[normalizedName] = exercise.id
        when {
            exercise.oneRM == null -> issues += Issue(
                Severity.WARNING,
                "NO_ONE_RM",
                "У упражнения «${exercise.name}» не задан 1ПМ",
                exerciseId = exercise.id,
            )
            !exercise.oneRM.isFinite() || exercise.oneRM <= 0.0 -> issues += Issue(
                Severity.ERROR,
                "INVALID_ONE_RM",
                "1ПМ упражнения «${exercise.name}» должен быть больше нуля",
                exerciseId = exercise.id,
            )
        }
        if (!exercise.impact.isFinite() || exercise.impact < 0.0) {
            issues += Issue(
                Severity.ERROR,
                "INVALID_IMPACT",
                "Коэффициент D упражнения «${exercise.name}» не может быть отрицательным",
                exerciseId = exercise.id,
            )
        }
        if (!exercise.multiplier.isFinite() || exercise.multiplier <= 0.0) {
            issues += Issue(
                Severity.ERROR,
                "INVALID_MULTIPLIER",
                "Коэффициент E упражнения «${exercise.name}» должен быть больше нуля",
                exerciseId = exercise.id,
            )
        }
        val rounding = exercise.rounding
        if (rounding is Rounding.Fixed && (!rounding.step.isFinite() || rounding.step <= 0.0)) {
            issues += Issue(
                Severity.ERROR,
                "INVALID_ROUNDING",
                "Шаг округления упражнения «${exercise.name}» должен быть больше нуля",
                exerciseId = exercise.id,
            )
        }
    }

    val dayIds = mutableSetOf<String>()
    for (day in project.dayTemplates) {
        if (!dayIds.add(day.id)) {
            issues += Issue(
                Severity.ERROR,
                "DUPLICATE_DAY_ID",
                "День «${day.name}» имеет повторяющийся ID",
            )
        }
    }

    val weekIds = mutableSetOf<String>()
    val usedExerciseIds = mutableSetOf<String>()
    for (week in project.weeks) {
        if (!weekIds.add(week.id)) {
            issues += Issue(
                Severity.ERROR,
                "DUPLICATE_WEEK_ID",
                "Неделя «${week.label}» имеет повторяющийся ID",
                weekId = week.id,
            )
        }
        var weekHasEntries = false
        for (day in week.days) {
            if (!dayNamesById.containsKey(day.dayTemplateId)) {
                issues += Issue(
                    Severity.ERROR,
                    "UNKNOWN_DAY",
                    "В неделе «${week.label}» есть ссылка на несуществующий день",
                    weekId = week.id,
                    dayTemplateId = day.dayTemplateId,
                )
            }
            if (day.entries.isEmpty()) {
                issues += Issue(
                    Severity.WARNING,
                    "EMPTY_DAY",
                    "В неделе «${week.label}» пустой день",
                    weekId = week.id,
                    dayTemplateId = day.dayTemplateId,
                )
            } else {
                weekHasEntries = true
            }
            val dayExerciseIds = mutableSetOf<String>()
            for (entry in day.entries) {
                val exercise = project.exercises.find { it.id == entry.exerciseId }
                if (exercise == null) {
                    issues += Issue(
                        Severity.ERROR,
                        "UNKNOWN_EXERCISE",
                        "В неделе «${week.label}» есть ссылка на несуществующее упражнение",
                        weekId = week.id,
                        dayTemplateId = day.dayTemplateId,
                        entryId = entry.id,
                        exerciseId = entry.exerciseId,
                    )
                } else {
                    usedExerciseIds += entry.exerciseId
                }
                if (!dayExerciseIds.add(entry.exerciseId)) {
                    issues += Issue(
                        Severity.WARNING,
                        "DUPLICATE_EXERCISE_IN_DAY",
                        "В дне недели «${week.label}» упражнение повторяется",
                        weekId = week.id,
                        dayTemplateId = day.dayTemplateId,
                        entryId = entry.id,
                        exerciseId = entry.exerciseId,
                    )
                }
                if (entry.groups.size > 12) {
                    issues += Issue(
                        Severity.WARNING,
                        "TOO_MANY_GROUPS",
                        "В упражнении недели «${week.label}» больше 12 групп",
                        weekId = week.id,
                        dayTemplateId = day.dayTemplateId,
                        entryId = entry.id,
                    )
                }
                val exerciseName = exerciseNamesById[entry.exerciseId] ?: "Упражнение"
                val dayName = dayNamesById[day.dayTemplateId] ?: day.dayTemplateId
                val context = "«$exerciseName», $dayName"
                for (group in entry.groups) {
                    if (!group.percent.isFinite() || group.percent < 0.0 || group.percent > 100.0) {
                        issues += Issue(
                            Severity.ERROR,
                            "INVALID_PERCENT",
                            "$context: процент должен быть в диапазоне 0–100",
                            weekId = week.id,
                            dayTemplateId = day.dayTemplateId,
                            entryId = entry.id,
                            groupId = group.id,
                        )
                    }
                    if (group.reps < 1) {
                        issues += Issue(
                            Severity.ERROR,
                            "INVALID_REPS",
                            "$context: повторы должны быть целым числом больше нуля",
                            weekId = week.id,
                            dayTemplateId = day.dayTemplateId,
                            entryId = entry.id,
                            groupId = group.id,
                        )
                    }
                    if (group.sets < 1) {
                        issues += Issue(
                            Severity.ERROR,
                            "INVALID_SETS",
                            "$context: подходы должны быть целым числом больше нуля",
                            weekId = week.id,
                            dayTemplateId = day.dayTemplateId,
                            entryId = entry.id,
                            groupId = group.id,
                        )
                    }
                }
            }
        }
        if (!weekHasEntries) {
            issues += Issue(
                Severity.WARNING,
                "EMPTY_WEEK",
                "Неделя «${week.label}» не содержит упражнений",
                weekId = week.id,
            )
        }
    }

    for (exercise in project.exercises) {
        if (exercise.id !in usedExerciseIds) {
            issues += Issue(
                Severity.WARNING,
                "UNUSED_EXERCISE",
                "Упражнение «${exercise.name}» не используется в цикле",
                exerciseId = exercise.id,
            )
        }
    }

    if (project.progression.stepPercent < 0.0) {
        issues += Issue(
            Severity.ERROR,
            "INVALID_PROGRESSION",
            "Шаг прогрессии не может быть отрицательным",
        )
    }
    if (project.progression.deload.reductionPercent !in 0.0..100.0) {
        issues += Issue(
            Severity.ERROR,
            "INVALID_DELOAD",
            "Процент разгрузки должен быть в диапазоне 0–100",
        )
    }

    val metrics = project.metrics
    if (metrics.funtikovTable.size != 101 ||
        metrics.funtikovTable.any { !it.isFinite() || it < 0.0 }
    ) {
        issues += Issue(
            Severity.ERROR,
            "INVALID_FUNTIKOV_TABLE",
            "Таблица Фунтикова должна содержать 101 неотрицательное число",
        )
    }
    val thresholds = metrics.timeThresholds
    val thresholdsValid = thresholds.isNotEmpty() &&
        thresholds.all {
            it.belowPercent.isFinite() && it.belowPercent in 0.0..100.0 &&
                it.factor.isFinite() && it.factor >= 0.0
        } &&
        thresholds.zipWithNext().all { (a, b) -> b.belowPercent > a.belowPercent } &&
        metrics.timeFallbackFactor.isFinite() && metrics.timeFallbackFactor >= 0.0
    if (!thresholdsValid) {
        issues += Issue(
            Severity.ERROR,
            "INVALID_TIME_THRESHOLDS",
            "Пороги времени должны возрастать, а факторы — быть неотрицательными",
        )
    }
    val impactValid = listOf(
        metrics.impactHeavyThreshold,
        metrics.impactLightThreshold,
        metrics.impactHeavyFactor,
        metrics.impactMediumFactor,
        metrics.impactLightFactor,
    ).all { it.isFinite() && it >= 0.0 } &&
        metrics.impactHeavyThreshold >= metrics.impactLightThreshold
    if (!impactValid) {
        issues += Issue(
            Severity.ERROR,
            "INVALID_IMPACT_FACTORS",
            "Факторы воздействия должны быть неотрицательными, а тяжёлый порог — не меньше лёгкого",
        )
    }

    return issues
}

fun hasBlockingErrors(issues: List<Issue>): Boolean = issues.any { it.severity == Severity.ERROR }

fun formatKg(value: Double?): String = if (value == null) "—" else "${formatNumber(value)} кг"

fun formatPercent(value: Double): String = "${formatNumber(value)}%"

fun formatMinutes(value: Int): String {
    if (value < 60) return "$value мин"
    val hours = value / 60
    val minutes = value % 60
    return "$hours ч $minutes мин"
}

fun formatNumber(value: Double): String {
    val rounded = kotlin.math.round(value * 100.0) / 100.0
    return if (abs(rounded - rounded.toLong()) < 1e-9) {
        rounded.toLong().toString()
    } else {
        rounded.toString()
    }
}
