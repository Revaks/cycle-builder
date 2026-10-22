package com.revaks.cyclebuilder.domain

import com.revaks.cyclebuilder.data.ComputedCycle
import com.revaks.cyclebuilder.data.ComputedDay
import com.revaks.cyclebuilder.data.ComputedEntry
import com.revaks.cyclebuilder.data.ComputedGroup
import com.revaks.cyclebuilder.data.ComputedWeek
import com.revaks.cyclebuilder.data.Entry
import com.revaks.cyclebuilder.data.Exercise
import com.revaks.cyclebuilder.data.MetricsConfig
import com.revaks.cyclebuilder.data.ProgressionConfig
import com.revaks.cyclebuilder.data.Project
import com.revaks.cyclebuilder.data.Rounding
import com.revaks.cyclebuilder.data.WeekDay
import java.math.BigDecimal
import kotlin.math.ceil
import kotlin.math.floor
import kotlin.math.max
import kotlin.math.min
import kotlin.math.pow

fun mround(value: Double, step: Double): Double {
    require(step > 0.0 && step.isFinite()) { "Шаг округления должен быть больше нуля" }
    val quotient = value / step
    val rounded = if (quotient >= 0) {
        floor(quotient + 0.5 + 1e-9)
    } else {
        ceil(quotient - 0.5 - 1e-9)
    }
    return BigDecimal.valueOf(rounded * step)
        .setScale(6, java.math.RoundingMode.HALF_UP)
        .toDouble()
}

fun autoStep(oneRM: Double): Double = when {
    oneRM > 50.0 -> 2.5
    oneRM < 15.0 -> 0.1
    else -> 1.0
}

fun resolveStep(oneRM: Double, rounding: Rounding): Double = when (rounding) {
    Rounding.Auto -> autoStep(oneRM)
    is Rounding.Fixed -> rounding.step
}

fun trendOneRM(base: Double, weekIndex: Int, progression: ProgressionConfig): Double {
    require(weekIndex >= 1) { "Номер недели должен быть >= 1" }
    return when (progression.mode) {
        "none" -> base
        "linear" -> base * (1.0 + (progression.stepPercent / 100.0) * (weekIndex - 1))
        else -> base * (1.0 + progression.stepPercent / 100.0).pow(weekIndex - 1)
    }
}

fun effectiveOneRM(
    base: Double,
    weekIndex: Int,
    progression: ProgressionConfig,
    isDeload: Boolean,
): Double {
    val trend = trendOneRM(base, weekIndex, progression)
    if (!isDeload) return trend
    val previous = if (weekIndex == 1) base else trendOneRM(base, weekIndex - 1, progression)
    return if (progression.deload.mode == "hold") {
        previous
    } else {
        previous * (1.0 - progression.deload.reductionPercent / 100.0)
    }
}

fun funtikovCoefficient(percent: Double, table: List<Double>): Double {
    if (!percent.isFinite() || percent < 30.0) return 0.0
    fun at(index: Int): Double = table.getOrElse(index) { 0.0 }
    return when {
        percent < 35.0 -> at(33)
        percent < 40.0 -> at(38)
        percent < 45.0 -> at(43)
        percent < 50.0 -> at(48)
        percent == 50.0 -> at(50)
        percent >= 100.0 -> at(100)
        else -> at(max(1, min(100, floor(percent).toInt())))
    }
}

fun timeFactor(percent: Double, config: MetricsConfig): Double {
    for (threshold in config.timeThresholds) {
        if (percent < threshold.belowPercent) return threshold.factor
    }
    return config.timeFallbackFactor
}

fun impactFactor(impact: Double, config: MetricsConfig): Double = when {
    impact >= config.impactHeavyThreshold -> config.impactHeavyFactor
    impact <= config.impactLightThreshold -> config.impactLightFactor
    else -> config.impactMediumFactor
}

fun calculateEntry(
    entry: Entry,
    exercise: Exercise,
    oneRM: Double?,
    metrics: MetricsConfig,
): ComputedEntry {
    val groups = entry.groups.map { group ->
        val percent = group.percent
        val weight = when {
            percent == 0.0 -> 0.0
            oneRM == null -> null
            else -> mround(
                oneRM * percent / 100.0,
                resolveStep(oneRM, exercise.rounding),
            )
        }
        val kpsh = group.reps * group.sets
        val tonnage = weight?.times(group.reps)?.times(group.sets)?.times(exercise.multiplier)
        val funtikov = weight?.let {
            it * group.reps * group.sets *
                funtikovCoefficient(percent, metrics.funtikovTable) *
                exercise.multiplier * exercise.impact
        }
        val timeMinutes = group.sets *
            timeFactor(percent, metrics) *
            impactFactor(exercise.impact, metrics)
        ComputedGroup(
            group = group,
            weight = weight,
            tonnage = tonnage,
            kpsh = kpsh,
            funtikov = funtikov,
            timeMinutes = timeMinutes,
        )
    }

    val tonnage = groups.sumOf { it.tonnage ?: 0.0 }
    val kpsh = groups.sumOf { it.kpsh }
    val weightedKpsh = if (oneRM == null) 0 else kpsh
    val funtikov = groups.sumOf { it.funtikov ?: 0.0 }
    val timeMinutes = groups.sumOf { it.timeMinutes }
    val avgWeight = if (weightedKpsh > 0) tonnage / weightedKpsh else null
    val hasMissingOneRM = oneRM == null
    val relativeIntensity = if (hasMissingOneRM || exercise.multiplier <= 0.0 || avgWeight == null) {
        null
    } else {
        avgWeight / (oneRM * exercise.multiplier)
    }

    return ComputedEntry(
        entry = entry,
        exercise = exercise,
        oneRM = oneRM,
        groups = groups,
        tonnage = tonnage,
        kpsh = kpsh,
        weightedKpsh = weightedKpsh,
        funtikov = funtikov,
        timeMinutes = timeMinutes,
        avgWeight = avgWeight,
        relativeIntensity = relativeIntensity,
        hasMissingOneRM = hasMissingOneRM,
    )
}

private fun calculateDay(
    weekDay: WeekDay,
    oneRMByExercise: Map<String, Double?>,
    project: Project,
    dayName: String,
): ComputedDay {
    val entries = weekDay.entries.mapNotNull { entry ->
        val exercise = project.exercises.find { it.id == entry.exerciseId } ?: return@mapNotNull null
        calculateEntry(
            entry = entry,
            exercise = exercise,
            oneRM = oneRMByExercise[exercise.id],
            metrics = project.metrics,
        )
    }
    val tonnage = entries.sumOf { it.tonnage }
    val kpsh = entries.sumOf { it.kpsh }
    val weightedKpsh = entries.sumOf { it.weightedKpsh }
    val funtikov = entries.sumOf { it.funtikov }
    val rawTime = entries.sumOf { it.timeMinutes }
    return ComputedDay(
        dayTemplateId = weekDay.dayTemplateId,
        dayName = dayName,
        entries = entries,
        tonnage = tonnage,
        kpsh = kpsh,
        weightedKpsh = weightedKpsh,
        funtikov = funtikov,
        timeMinutes = if (rawTime == 0.0) 0 else floor(rawTime + 30.0).toInt(),
        avgWeight = if (weightedKpsh > 0) tonnage / weightedKpsh else null,
    )
}

fun calculateCycle(project: Project): ComputedCycle {
    val weeks = project.weeks.mapIndexed { index, week ->
        val oneRMByExercise = project.exercises.associate { exercise ->
            exercise.id to exercise.oneRM?.let { base ->
                effectiveOneRM(base, index + 1, project.progression, week.isDeload)
            }
        }
        val days = week.days.map { weekDay ->
            val dayTemplate = project.dayTemplates.find { it.id == weekDay.dayTemplateId }
            calculateDay(
                weekDay = weekDay,
                oneRMByExercise = oneRMByExercise,
                project = project,
                dayName = dayTemplate?.name ?: weekDay.dayTemplateId,
            )
        }
        val tonnage = days.sumOf { it.tonnage }
        val kpsh = days.sumOf { it.kpsh }
        val weightedKpsh = days.sumOf { it.weightedKpsh }
        val funtikov = days.sumOf { it.funtikov }
        val timeMinutes = days.sumOf { it.timeMinutes }
        ComputedWeek(
            weekId = week.id,
            label = week.label,
            isDeload = week.isDeload,
            oneRMByExercise = oneRMByExercise,
            days = days,
            tonnage = tonnage,
            kpsh = kpsh,
            weightedKpsh = weightedKpsh,
            funtikov = funtikov,
            timeMinutes = timeMinutes,
            avgWeight = if (weightedKpsh > 0) tonnage / weightedKpsh else null,
        )
    }
    val tonnage = weeks.sumOf { it.tonnage }
    val kpsh = weeks.sumOf { it.kpsh }
    val weightedKpsh = weeks.sumOf { it.weightedKpsh }
    return ComputedCycle(
        weeks = weeks,
        tonnage = tonnage,
        kpsh = kpsh,
        weightedKpsh = weightedKpsh,
        funtikov = weeks.sumOf { it.funtikov },
        timeMinutes = weeks.sumOf { it.timeMinutes },
        avgWeight = if (weightedKpsh > 0) tonnage / weightedKpsh else null,
    )
}
