package com.revaks.cyclebuilder.ui.screens

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.LazyRow
import androidx.compose.foundation.lazy.itemsIndexed
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.outlined.Add
import androidx.compose.material.icons.outlined.ContentCopy
import androidx.compose.material.icons.outlined.Delete
import androidx.compose.material.icons.outlined.DeleteOutline
import androidx.compose.material3.AssistChip
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.Switch
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import com.revaks.cyclebuilder.data.ComputedDay
import com.revaks.cyclebuilder.data.ComputedEntry
import com.revaks.cyclebuilder.data.ComputedGroup
import com.revaks.cyclebuilder.data.ComputedWeek
import com.revaks.cyclebuilder.data.SetGroup
import com.revaks.cyclebuilder.data.formatKg
import com.revaks.cyclebuilder.data.formatMinutes
import com.revaks.cyclebuilder.data.formatNumber
import com.revaks.cyclebuilder.data.formatPercent
import com.revaks.cyclebuilder.ui.CycleBuilderViewModel
import com.revaks.cyclebuilder.ui.UiState
import com.revaks.cyclebuilder.ui.components.AddEntryDialog
import com.revaks.cyclebuilder.ui.components.ConfirmDialog
import com.revaks.cyclebuilder.ui.components.GroupEditorDialog
import com.revaks.cyclebuilder.ui.components.KpiCard
import com.revaks.cyclebuilder.ui.components.SectionCard
import com.revaks.cyclebuilder.ui.components.WeekChips

private data class GroupTarget(
    val weekId: String,
    val dayTemplateId: String,
    val entryId: String,
    val group: SetGroup,
    val index: Int,
)

private data class EntryTarget(
    val weekId: String,
    val dayTemplateId: String,
    val entryId: String,
    val exerciseName: String,
)

@Composable
fun ProgramScreen(
    state: UiState,
    viewModel: CycleBuilderViewModel,
    modifier: Modifier = Modifier,
) {
    val selectedWeek = state.cycle.weeks.find { it.weekId == state.selectedWeekId }
        ?: state.cycle.weeks.firstOrNull()

    var editingGroup by remember { mutableStateOf<GroupTarget?>(null) }
    var deletingEntry by remember { mutableStateOf<EntryTarget?>(null) }
    var deletingWeek by remember { mutableStateOf<String?>(null) }
    var addingEntryDay by remember { mutableStateOf<String?>(null) }

    LazyColumn(
        modifier = modifier.fillMaxSize(),
        contentPadding = PaddingValues(16.dp),
        verticalArrangement = Arrangement.spacedBy(12.dp),
    ) {
        item {
            Column {
                Text(
                    "Программа",
                    style = MaterialTheme.typography.labelLarge,
                    color = MaterialTheme.colorScheme.primary,
                )
                Text("Недели и тренировки", style = MaterialTheme.typography.headlineSmall)
                Text(
                    "Меняйте подходы, повторы и проценты — вес и итоги пересчитываются сразу.",
                    style = MaterialTheme.typography.bodyMedium,
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                )
            }
        }

        item {
            WeekChips(
                weeks = state.project.weeks,
                selectedId = selectedWeek?.weekId,
                onSelect = viewModel::selectWeek,
            )
        }

        item {
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.spacedBy(8.dp),
            ) {
                OutlinedButton(onClick = { viewModel.addWeek() }) {
                    Icon(Icons.Outlined.Add, contentDescription = null)
                    Text("Неделя")
                }
                OutlinedButton(
                    onClick = { selectedWeek?.let { viewModel.duplicateWeek(it.weekId) } },
                    enabled = selectedWeek != null,
                ) {
                    Icon(Icons.Outlined.ContentCopy, contentDescription = null)
                    Text("Копия")
                }
                OutlinedButton(
                    onClick = { deletingWeek = selectedWeek?.weekId },
                    enabled = selectedWeek != null,
                ) {
                    Icon(Icons.Outlined.DeleteOutline, contentDescription = null)
                    Text("Удалить")
                }
            }
        }

        if (selectedWeek == null) {
            item {
                SectionCard("В цикле нет недель") {
                    Text("Добавьте первую неделю, чтобы начать программу.")
                }
            }
        } else {
            item {
                SectionCard(selectedWeek.label) {
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        verticalAlignment = Alignment.CenterVertically,
                        horizontalArrangement = Arrangement.SpaceBetween,
                    ) {
                        Column(Modifier.weight(1f)) {
                            Text("Разгрузочная неделя", style = MaterialTheme.typography.titleSmall)
                            Text(
                                "1ПМ считается по предыдущей неделе",
                                style = MaterialTheme.typography.bodySmall,
                                color = MaterialTheme.colorScheme.onSurfaceVariant,
                            )
                        }
                        Switch(
                            checked = selectedWeek.isDeload,
                            onCheckedChange = { viewModel.setWeekDeload(selectedWeek.weekId, it) },
                        )
                    }
                }
            }

            item {
                Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                    KpiCard(
                        "Тоннаж",
                        "${formatNumber(selectedWeek.tonnage)} кг",
                        Modifier.weight(1f),
                    )
                    KpiCard("КПШ", selectedWeek.kpsh.toString(), Modifier.weight(1f))
                }
            }
            item {
                Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                    KpiCard(
                        "Время",
                        formatMinutes(selectedWeek.timeMinutes),
                        Modifier.weight(1f),
                    )
                    KpiCard(
                        "Средний вес",
                        formatKg(selectedWeek.avgWeight),
                        Modifier.weight(1f),
                    )
                }
            }

            itemsIndexed(
                items = selectedWeek.days,
                key = { _, day -> day.dayTemplateId },
            ) { _, day ->
                DayCard(
                    day = day,
                    onEditGroup = { entry, group, index ->
                        editingGroup = GroupTarget(
                            weekId = selectedWeek.weekId,
                            dayTemplateId = day.dayTemplateId,
                            entryId = entry.entry.id,
                            group = group.group,
                            index = index,
                        )
                    },
                    onDeleteEntry = { entry ->
                        deletingEntry = EntryTarget(
                            weekId = selectedWeek.weekId,
                            dayTemplateId = day.dayTemplateId,
                            entryId = entry.entry.id,
                            exerciseName = entry.exercise.name,
                        )
                    },
                    onAddGroup = { entry ->
                        viewModel.addGroup(
                            selectedWeek.weekId,
                            day.dayTemplateId,
                            entry.entry.id,
                        )
                    },
                    onAddEntry = { addingEntryDay = day.dayTemplateId },
                )
            }
        }
    }

    editingGroup?.let { target ->
        GroupEditorDialog(
            group = target.group,
            index = target.index,
            onDismiss = { editingGroup = null },
            onSave = { patch ->
                viewModel.updateGroup(
                    target.weekId,
                    target.dayTemplateId,
                    target.entryId,
                    target.group.id,
                    patch,
                )
                editingGroup = null
            },
            onDelete = {
                viewModel.removeGroup(
                    target.weekId,
                    target.dayTemplateId,
                    target.entryId,
                    target.group.id,
                )
                editingGroup = null
            },
        )
    }

    deletingEntry?.let { target ->
        ConfirmDialog(
            open = true,
            title = "Удалить упражнение?",
            message = "«${target.exerciseName}» будет убрано из этой тренировки.",
            confirmLabel = "Удалить",
            onConfirm = {
                viewModel.removeEntry(
                    target.weekId,
                    target.dayTemplateId,
                    target.entryId,
                    allWeeks = false,
                )
                deletingEntry = null
            },
            onDismiss = { deletingEntry = null },
        )
    }

    deletingWeek?.let { weekId ->
        ConfirmDialog(
            open = true,
            title = "Удалить неделю?",
            message = "Неделя будет удалена вместе со всеми тренировками.",
            confirmLabel = "Удалить неделю",
            onConfirm = {
                viewModel.removeWeek(weekId)
                deletingWeek = null
            },
            onDismiss = { deletingWeek = null },
        )
    }

    addingEntryDay?.let { dayTemplateId ->
        AddEntryDialog(
            exercises = state.project.exercises,
            onDismiss = { addingEntryDay = null },
            onAdd = { exerciseId, allWeeks ->
                selectedWeek?.let { week ->
                    viewModel.addEntry(week.weekId, dayTemplateId, exerciseId, allWeeks)
                }
                addingEntryDay = null
            },
        )
    }
}

@Composable
private fun DayCard(
    day: ComputedDay,
    onEditGroup: (ComputedEntry, ComputedGroup, Int) -> Unit,
    onDeleteEntry: (ComputedEntry) -> Unit,
    onAddGroup: (ComputedEntry) -> Unit,
    onAddEntry: () -> Unit,
) {
    SectionCard(
        title = day.dayName,
        subtitle = "${formatNumber(day.tonnage)} кг · ${day.kpsh} КПШ · ${formatMinutes(day.timeMinutes)}",
    ) {
        if (day.entries.isEmpty()) {
            Text(
                "В этом дне пока нет упражнений.",
                style = MaterialTheme.typography.bodyMedium,
                color = MaterialTheme.colorScheme.onSurfaceVariant,
            )
        } else {
            day.entries.forEach { entry ->
                EntryCard(
                    entry = entry,
                    onEditGroup = { group, index -> onEditGroup(entry, group, index) },
                    onDelete = { onDeleteEntry(entry) },
                    onAddGroup = { onAddGroup(entry) },
                )
            }
        }
        TextButton(onClick = onAddEntry) {
            Icon(Icons.Outlined.Add, contentDescription = null)
            Text("Добавить упражнение")
        }
    }
}

@Composable
private fun EntryCard(
    entry: ComputedEntry,
    onEditGroup: (ComputedGroup, Int) -> Unit,
    onDelete: () -> Unit,
    onAddGroup: () -> Unit,
) {
    Column(
        modifier = Modifier
            .fillMaxWidth()
            .padding(vertical = 6.dp),
    ) {
        Row(verticalAlignment = Alignment.CenterVertically) {
            Column(Modifier.weight(1f)) {
                Text(
                    entry.exercise.name,
                    style = MaterialTheme.typography.titleSmall,
                    fontWeight = FontWeight.SemiBold,
                )
                Text(
                    "1ПМ ${formatKg(entry.oneRM)}",
                    style = MaterialTheme.typography.bodySmall,
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                )
            }
            if (entry.hasMissingOneRM) {
                Text(
                    "нет 1ПМ",
                    style = MaterialTheme.typography.labelSmall,
                    color = MaterialTheme.colorScheme.tertiary,
                )
            }
            IconButton(onClick = onDelete) {
                Icon(Icons.Outlined.Delete, contentDescription = "Удалить ${entry.exercise.name}")
            }
        }

        LazyRow(
            contentPadding = PaddingValues(end = 12.dp),
            horizontalArrangement = Arrangement.spacedBy(6.dp),
        ) {
            itemsIndexed(entry.groups, key = { _, group -> group.group.id }) { index, group ->
                AssistChip(
                    onClick = { onEditGroup(group, index) },
                    label = {
                        Text(
                            "${group.group.sets}×${group.group.reps} @ ${formatPercent(group.group.percent)} → ${formatKg(group.weight)}",
                        )
                    },
                )
            }
            item {
                AssistChip(
                    onClick = onAddGroup,
                    label = { Text("+ группа") },
                )
            }
        }

        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(top = 4.dp),
            horizontalArrangement = Arrangement.spacedBy(14.dp),
        ) {
            EntryMetric("Тоннаж", if (entry.hasMissingOneRM) "—" else "${formatNumber(entry.tonnage)} кг")
            EntryMetric("КПШ", entry.kpsh.toString())
            EntryMetric("Время", formatMinutes(entry.timeMinutes.toInt()))
        }
    }
}

@Composable
private fun EntryMetric(label: String, value: String) {
    Row(horizontalArrangement = Arrangement.spacedBy(4.dp)) {
        Text(
            label,
            style = MaterialTheme.typography.labelSmall,
            color = MaterialTheme.colorScheme.onSurfaceVariant,
        )
        Text(value, style = MaterialTheme.typography.labelMedium)
    }
}
