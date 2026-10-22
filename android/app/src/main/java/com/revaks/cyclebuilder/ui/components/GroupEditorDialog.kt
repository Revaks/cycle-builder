package com.revaks.cyclebuilder.ui.components

import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.unit.dp
import com.revaks.cyclebuilder.data.SetGroup
import com.revaks.cyclebuilder.data.formatNumber
import com.revaks.cyclebuilder.ui.GroupPatch

@Composable
fun GroupEditorDialog(
    group: SetGroup,
    index: Int,
    onDismiss: () -> Unit,
    onSave: (GroupPatch) -> Unit,
    onDelete: () -> Unit,
) {
    var setsText by remember(group.id) { mutableStateOf(group.sets.toString()) }
    var repsText by remember(group.id) { mutableStateOf(group.reps.toString()) }
    var percentText by remember(group.id) { mutableStateOf(formatNumber(group.percent)) }

    val sets = setsText.toIntOrNull()
    val reps = repsText.toIntOrNull()
    val percent = percentText.replace(',', '.').toDoubleOrNull()
    val valid = sets != null && sets >= 1 && reps != null && reps >= 1 &&
        percent != null && percent in 0.0..100.0

    AlertDialog(
        onDismissRequest = onDismiss,
        title = { Text("Группа ${index + 1}") },
        text = {
            Column(Modifier.verticalScroll(rememberScrollState())) {
                NumberField(
                    label = "Подходы",
                    value = setsText,
                    onValueChange = { setsText = it.filter(Char::isDigit) },
                    keyboardType = KeyboardType.Number,
                )
                NumberField(
                    label = "Повторы",
                    value = repsText,
                    onValueChange = { repsText = it.filter(Char::isDigit) },
                    modifier = Modifier.padding(top = 8.dp),
                    keyboardType = KeyboardType.Number,
                )
                NumberField(
                    label = "Процент от 1ПМ",
                    value = percentText,
                    onValueChange = { percentText = it },
                    modifier = Modifier.padding(top = 8.dp),
                )
            }
        },
        confirmButton = {
            TextButton(
                enabled = valid,
                onClick = {
                    onSave(GroupPatch(percent = percent, reps = reps, sets = sets))
                },
            ) { Text("Сохранить") }
        },
        dismissButton = {
            Row {
                TextButton(onClick = onDelete) {
                    Text("Удалить", color = MaterialTheme.colorScheme.error)
                }
                TextButton(onClick = onDismiss) { Text("Отмена") }
            }
        },
    )
}
