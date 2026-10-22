package com.revaks.cyclebuilder.ui.screens

import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.outlined.Add
import androidx.compose.material.icons.outlined.Delete
import androidx.compose.material.icons.outlined.Edit
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import com.revaks.cyclebuilder.data.Exercise
import com.revaks.cyclebuilder.data.formatKg
import com.revaks.cyclebuilder.data.formatNumber
import com.revaks.cyclebuilder.ui.CycleBuilderViewModel
import com.revaks.cyclebuilder.ui.UiState
import com.revaks.cyclebuilder.ui.components.ConfirmDialog
import com.revaks.cyclebuilder.ui.components.ExerciseFormDialog
import com.revaks.cyclebuilder.ui.components.roundingLabel

@Composable
fun ExercisesScreen(
    state: UiState,
    viewModel: CycleBuilderViewModel,
    modifier: Modifier = Modifier,
) {
    var showForm by remember { mutableStateOf(false) }
    var editing by remember { mutableStateOf<Exercise?>(null) }
    var deleting by remember { mutableStateOf<Exercise?>(null) }

    LazyColumn(
        modifier = modifier.fillMaxSize(),
        contentPadding = PaddingValues(16.dp),
        verticalArrangement = Arrangement.spacedBy(10.dp),
    ) {
        item {
            Column {
                Text(
                    "Справочник",
                    style = MaterialTheme.typography.labelLarge,
                    color = MaterialTheme.colorScheme.primary,
                )
                Text("Упражнения и 1ПМ", style = MaterialTheme.typography.headlineSmall)
                Text(
                    "D — коэффициент воздействия, E — множитель для гантелей и блока.",
                    style = MaterialTheme.typography.bodyMedium,
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                )
            }
        }
        item {
            OutlinedButton(onClick = { editing = null; showForm = true }) {
                Icon(Icons.Outlined.Add, contentDescription = null)
                Text("Добавить упражнение")
            }
        }
        items(state.project.exercises, key = { it.id }) { exercise ->
            val usage = state.project.weeks.sumOf { week ->
                week.days.sumOf { day ->
                    day.entries.count { it.exerciseId == exercise.id }
                }
            }
            Card(
                modifier = Modifier
                    .fillMaxWidth()
                    .clickable { editing = exercise; showForm = true },
                colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface),
            ) {
                Row(
                    modifier = Modifier.padding(14.dp),
                    verticalAlignment = Alignment.CenterVertically,
                ) {
                    Column(Modifier.weight(1f)) {
                        Text(exercise.name, style = MaterialTheme.typography.titleSmall)
                        Text(
                            "1ПМ ${formatKg(exercise.oneRM)} · D ${formatNumber(exercise.impact)} · E ${formatNumber(exercise.multiplier)} · округление ${roundingLabel(exercise.rounding)}",
                            style = MaterialTheme.typography.bodySmall,
                            color = MaterialTheme.colorScheme.onSurfaceVariant,
                        )
                        if (exercise.oneRM == null) {
                            Text(
                                "Вес не рассчитывается без 1ПМ",
                                style = MaterialTheme.typography.labelSmall,
                                color = MaterialTheme.colorScheme.tertiary,
                            )
                        }
                        Text(
                            "Используется: $usage",
                            style = MaterialTheme.typography.labelSmall,
                            color = MaterialTheme.colorScheme.onSurfaceVariant,
                        )
                    }
                    IconButton(onClick = { editing = exercise; showForm = true }) {
                        Icon(Icons.Outlined.Edit, contentDescription = "Изменить ${exercise.name}")
                    }
                    IconButton(onClick = { deleting = exercise }) {
                        Icon(Icons.Outlined.Delete, contentDescription = "Удалить ${exercise.name}")
                    }
                }
            }
        }
    }

    if (showForm) {
        ExerciseFormDialog(
            exercise = editing,
            onDismiss = { showForm = false },
            onSave = { name, oneRM, impact, multiplier, rounding ->
                val current = editing
                if (current == null) {
                    viewModel.addExercise(name, oneRM, impact, multiplier, rounding)
                } else {
                    viewModel.updateExercise(
                        current.id,
                        name,
                        oneRM,
                        impact,
                        multiplier,
                        rounding,
                    )
                }
                showForm = false
            },
        )
    }

    deleting?.let { exercise ->
        val usage = state.project.weeks.sumOf { week ->
            week.days.sumOf { day -> day.entries.count { it.exerciseId == exercise.id } }
        }
        ConfirmDialog(
            open = true,
            title = "Удалить упражнение?",
            message = "«${exercise.name}» будет удалено из справочника и из $usage строк программы.",
            confirmLabel = "Удалить упражнение",
            onConfirm = {
                viewModel.removeExercise(exercise.id)
                deleting = null
            },
            onDismiss = { deleting = null },
        )
    }
}
