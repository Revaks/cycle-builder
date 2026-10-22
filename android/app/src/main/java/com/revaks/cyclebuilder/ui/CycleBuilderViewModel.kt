package com.revaks.cyclebuilder.ui

import android.app.Application
import androidx.lifecycle.AndroidViewModel
import androidx.lifecycle.viewModelScope
import com.revaks.cyclebuilder.data.ComputedCycle
import com.revaks.cyclebuilder.data.DayTemplate
import com.revaks.cyclebuilder.data.Entry
import com.revaks.cyclebuilder.data.Exercise
import com.revaks.cyclebuilder.data.Issue
import com.revaks.cyclebuilder.data.Project
import com.revaks.cyclebuilder.data.ProjectJson
import com.revaks.cyclebuilder.data.ProjectRepository
import com.revaks.cyclebuilder.data.Rounding
import com.revaks.cyclebuilder.data.SetGroup
import com.revaks.cyclebuilder.data.Severity
import com.revaks.cyclebuilder.data.TimeThreshold
import com.revaks.cyclebuilder.data.Week
import com.revaks.cyclebuilder.data.WeekDay
import com.revaks.cyclebuilder.domain.calculateCycle
import com.revaks.cyclebuilder.data.validateProject
import kotlinx.coroutines.flow.MutableSharedFlow
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.asSharedFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch
import java.time.Instant
import java.util.UUID

data class UiState(
    val project: Project,
    val cycle: ComputedCycle,
    val issues: List<Issue>,
    val selectedWeekId: String?,
)

data class GroupPatch(
    val percent: Double? = null,
    val reps: Int? = null,
    val sets: Int? = null,
)

class CycleBuilderViewModel(application: Application) : AndroidViewModel(application) {
    private val repository = ProjectRepository(application)

    private val initialProject = repository.load()
    private val _state = MutableStateFlow(
        UiState(
            project = initialProject,
            cycle = calculateCycle(initialProject),
            issues = validateProject(initialProject),
            selectedWeekId = initialProject.weeks.firstOrNull()?.id,
        ),
    )
    val state = _state.asStateFlow()

    private val _messages = MutableSharedFlow<String>(extraBufferCapacity = 2)
    val messages = _messages.asSharedFlow()

    val hasBlockingErrors: Boolean
        get() = _state.value.issues.any { it.severity == Severity.ERROR }

    private fun newId(prefix: String): String = "$prefix-${UUID.randomUUID()}"

    private fun now(): String = Instant.now().toString()

    private fun normalizeWeekLabels(weeks: List<Week>): List<Week> =
        weeks.mapIndexed { index, week -> week.copy(label = "Неделя ${index + 1}") }

    private fun commit(project: Project, selectedWeekId: String? = null) {
        val next = project.copy(updatedAt = now())
        val selected = selectedWeekId?.takeIf { id -> next.weeks.any { it.id == id } }
            ?: _state.value.selectedWeekId?.takeIf { id -> next.weeks.any { it.id == id } }
            ?: next.weeks.firstOrNull()?.id
        _state.value = UiState(
            project = next,
            cycle = calculateCycle(next),
            issues = validateProject(next),
            selectedWeekId = selected,
        )
        viewModelScope.launch { repository.save(next) }
    }

    fun selectWeek(weekId: String) {
        if (_state.value.project.weeks.any { it.id == weekId }) {
            _state.value = _state.value.copy(selectedWeekId = weekId)
        }
    }

    fun setProjectName(name: String) = commit(_state.value.project.copy(name = name))

    fun updateExercise(
        id: String,
        name: String,
        oneRM: Double?,
        impact: Double,
        multiplier: Double,
        rounding: Rounding,
    ) {
        val project = _state.value.project
        commit(
            project.copy(
                exercises = project.exercises.map { exercise ->
                    if (exercise.id == id) {
                        exercise.copy(
                            name = name,
                            oneRM = oneRM,
                            impact = impact,
                            multiplier = multiplier,
                            rounding = rounding,
                        )
                    } else {
                        exercise
                    }
                },
            ),
        )
    }

    fun addExercise(
        name: String,
        oneRM: Double?,
        impact: Double = 1.0,
        multiplier: Double = 1.0,
        rounding: Rounding = _state.value.project.defaultRounding,
    ) {
        val project = _state.value.project
        commit(
            project.copy(
                exercises = project.exercises + Exercise(
                    id = newId("ex"),
                    name = name.trim(),
                    oneRM = oneRM,
                    impact = impact,
                    multiplier = multiplier,
                    rounding = rounding,
                ),
            ),
        )
    }

    fun removeExercise(id: String) {
        val project = _state.value.project
        val weeks = project.weeks.map { week ->
            week.copy(
                days = week.days.map { day ->
                    day.copy(entries = day.entries.filterNot { it.exerciseId == id })
                },
            )
        }
        commit(project.copy(exercises = project.exercises.filterNot { it.id == id }, weeks = weeks))
    }

    fun setWeekDeload(weekId: String, value: Boolean) {
        val project = _state.value.project
        commit(
            project.copy(
                weeks = project.weeks.map { week ->
                    if (week.id == weekId) week.copy(isDeload = value) else week
                },
            ),
        )
    }

    fun addWeek() {
        val project = _state.value.project
        val week = Week(
            id = newId("week"),
            label = "",
            days = project.dayTemplates.map { WeekDay(it.id) },
        )
        val weeks = normalizeWeekLabels(project.weeks + week)
        commit(project.copy(weeks = weeks), weeks.lastOrNull()?.id)
    }

    fun duplicateWeek(weekId: String) {
        val project = _state.value.project
        val index = project.weeks.indexOfFirst { it.id == weekId }
        if (index < 0) return
        val source = project.weeks[index]
        val copy = source.copy(
            id = newId("week"),
            label = "",
            days = source.days.map { day ->
                day.copy(
                    entries = day.entries.map { entry ->
                        entry.copy(
                            id = newId("entry"),
                            groups = entry.groups.map { group -> group.copy(id = newId("group")) },
                        )
                    },
                )
            },
        )
        val weeks = project.weeks.toMutableList().apply { add(index + 1, copy) }
        val normalized = normalizeWeekLabels(weeks)
        commit(project.copy(weeks = normalized), normalized.getOrNull(index + 1)?.id)
    }

    fun removeWeek(weekId: String) {
        val project = _state.value.project
        val weeks = normalizeWeekLabels(project.weeks.filterNot { it.id == weekId })
        commit(project.copy(weeks = weeks))
    }

    fun updateGroup(
        weekId: String,
        dayTemplateId: String,
        entryId: String,
        groupId: String,
        patch: GroupPatch,
    ) {
        updateEntry(weekId, dayTemplateId, entryId) { entry ->
            entry.copy(
                groups = entry.groups.map { group ->
                    if (group.id != groupId) return@map group
                    group.copy(
                        percent = patch.percent ?: group.percent,
                        reps = patch.reps ?: group.reps,
                        sets = patch.sets ?: group.sets,
                    )
                },
            )
        }
    }

    fun addGroup(weekId: String, dayTemplateId: String, entryId: String) {
        updateEntry(weekId, dayTemplateId, entryId) { entry ->
            entry.copy(
                groups = entry.groups + SetGroup(
                    id = newId("group"),
                    percent = 60.0,
                    reps = 10,
                    sets = 3,
                ),
            )
        }
    }

    fun removeGroup(weekId: String, dayTemplateId: String, entryId: String, groupId: String) {
        updateEntry(weekId, dayTemplateId, entryId) { entry ->
            entry.copy(groups = entry.groups.filterNot { it.id == groupId })
        }
    }

    fun addEntry(weekId: String, dayTemplateId: String, exerciseId: String, allWeeks: Boolean) {
        val project = _state.value.project
        val defaultGroup = SetGroup(newId("group"), 60.0, 10, 3)
        val weeks = project.weeks.map { week ->
            if (!allWeeks && week.id != weekId) return@map week
            week.copy(
                days = week.days.map { day ->
                    if (day.dayTemplateId != dayTemplateId ||
                        day.entries.any { it.exerciseId == exerciseId }
                    ) {
                        day
                    } else {
                        day.copy(
                            entries = day.entries + Entry(
                                id = newId("entry"),
                                exerciseId = exerciseId,
                                groups = listOf(defaultGroup.copy(id = newId("group"))),
                            ),
                        )
                    }
                },
            )
        }
        commit(project.copy(weeks = weeks))
    }

    fun removeEntry(
        weekId: String,
        dayTemplateId: String,
        entryId: String,
        allWeeks: Boolean,
    ) {
        val project = _state.value.project
        val target = project.weeks
            .find { it.id == weekId }
            ?.days?.find { it.dayTemplateId == dayTemplateId }
            ?.entries?.find { it.id == entryId }
            ?: return
        val exerciseId = target.exerciseId
        val weeks = project.weeks.map { week ->
            if (!allWeeks && week.id != weekId) return@map week
            week.copy(
                days = week.days.map { day ->
                    if (day.dayTemplateId != dayTemplateId) {
                        day
                    } else {
                        day.copy(
                            entries = day.entries.filterNot {
                                if (allWeeks) it.exerciseId == exerciseId else it.id == entryId
                            },
                        )
                    }
                },
            )
        }
        commit(project.copy(weeks = weeks))
    }

    fun setProgression(
        mode: String,
        stepPercent: Double,
        deloadMode: String,
        reductionPercent: Double,
    ) {
        val project = _state.value.project
        commit(
            project.copy(
                progression = project.progression.copy(
                    mode = mode,
                    stepPercent = stepPercent,
                    deload = project.progression.deload.copy(
                        mode = deloadMode,
                        reductionPercent = reductionPercent,
                    ),
                ),
            ),
        )
    }

    fun setDefaultRounding(rounding: Rounding) {
        commit(_state.value.project.copy(defaultRounding = rounding))
    }

    fun updateFuntikov(index: Int, value: Double) {
        val project = _state.value.project
        val table = project.metrics.funtikovTable.toMutableList()
        if (index !in table.indices) return
        table[index] = value
        commit(project.copy(metrics = project.metrics.copy(funtikovTable = table)))
    }

    fun updateTimeThreshold(index: Int, threshold: TimeThreshold) {
        val project = _state.value.project
        val thresholds = project.metrics.timeThresholds.toMutableList()
        if (index !in thresholds.indices) return
        thresholds[index] = threshold
        commit(project.copy(metrics = project.metrics.copy(timeThresholds = thresholds)))
    }

    fun updateTimeFallback(value: Double) {
        val project = _state.value.project
        commit(project.copy(metrics = project.metrics.copy(timeFallbackFactor = value)))
    }

    fun updateImpactFactors(
        heavyThreshold: Double,
        lightThreshold: Double,
        heavyFactor: Double,
        mediumFactor: Double,
        lightFactor: Double,
    ) {
        val project = _state.value.project
        commit(
            project.copy(
                metrics = project.metrics.copy(
                    impactHeavyThreshold = heavyThreshold,
                    impactLightThreshold = lightThreshold,
                    impactHeavyFactor = heavyFactor,
                    impactMediumFactor = mediumFactor,
                    impactLightFactor = lightFactor,
                ),
            ),
        )
    }

    fun resetToSeed() {
        val seed = com.revaks.cyclebuilder.data.SeedLoader.load(getApplication())
        commit(seed)
        _messages.tryEmit("Проект сброшен к шаблону cycle8")
    }

    fun exportJson(): String = ProjectJson.encode(_state.value.project)

    fun importJson(text: String): Boolean {
        return when (val result = ProjectJson.decodeChecked(text)) {
            is com.revaks.cyclebuilder.data.ImportResult.Success -> {
                commit(result.project)
                _messages.tryEmit("Проект импортирован")
                true
            }
            is com.revaks.cyclebuilder.data.ImportResult.Failure -> {
                _messages.tryEmit(result.message)
                false
            }
        }
    }

    private fun updateEntry(
        weekId: String,
        dayTemplateId: String,
        entryId: String,
        transform: (Entry) -> Entry,
    ) {
        val project = _state.value.project
        val weeks = project.weeks.map { week ->
            if (week.id != weekId) return@map week
            week.copy(
                days = week.days.map { day ->
                    if (day.dayTemplateId != dayTemplateId) return@map day
                    day.copy(
                        entries = day.entries.map { entry ->
                            if (entry.id == entryId) transform(entry) else entry
                        },
                    )
                },
            )
        }
        commit(project.copy(weeks = weeks))
    }

    fun dayTemplates(): List<DayTemplate> = _state.value.project.dayTemplates
}
