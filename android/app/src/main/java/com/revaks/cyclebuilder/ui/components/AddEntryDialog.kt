package com.revaks.cyclebuilder.ui.components

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.Checkbox
import androidx.compose.material3.DropdownMenu
import androidx.compose.material3.DropdownMenuItem
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import com.revaks.cyclebuilder.data.Exercise

@Composable
fun AddEntryDialog(
    exercises: List<Exercise>,
    onDismiss: () -> Unit,
    onAdd: (exerciseId: String, allWeeks: Boolean) -> Unit,
) {
    var expanded by remember { mutableStateOf(false) }
    var selectedId by remember { mutableStateOf(exercises.firstOrNull()?.id) }
    var allWeeks by remember { mutableStateOf(false) }
    val selected = exercises.find { it.id == selectedId }

    AlertDialog(
        onDismissRequest = onDismiss,
        title = { Text("Добавить упражнение") },
        text = {
            Column(verticalArrangement = Arrangement.spacedBy(10.dp)) {
                if (exercises.isEmpty()) {
                    Text("Сначала добавьте упражнение в справочник.")
                } else {
                    Box {
                        OutlinedButton(
                            onClick = { expanded = true },
                            modifier = Modifier.fillMaxWidth(),
                        ) {
                            Text(selected?.name ?: "Выберите упражнение")
                        }
                        DropdownMenu(
                            expanded = expanded,
                            onDismissRequest = { expanded = false },
                        ) {
                            exercises.forEach { exercise ->
                                DropdownMenuItem(
                                    text = { Text(exercise.name) },
                                    onClick = {
                                        selectedId = exercise.id
                                        expanded = false
                                    },
                                )
                            }
                        }
                    }
                    Row(
                        modifier = Modifier.padding(top = 4.dp),
                        horizontalArrangement = Arrangement.spacedBy(4.dp),
                    ) {
                        Checkbox(checked = allWeeks, onCheckedChange = { allWeeks = it })
                        Text("Сразу во все недели")
                    }
                }
            }
        },
        confirmButton = {
            TextButton(
                enabled = selectedId != null,
                onClick = { onAdd(selectedId!!, allWeeks) },
            ) { Text("Добавить") }
        },
        dismissButton = {
            TextButton(onClick = onDismiss) { Text("Отмена") }
        },
    )
}
