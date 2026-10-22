package com.revaks.cyclebuilder.ui.components

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.AlertDialog
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
import com.revaks.cyclebuilder.data.Rounding
import com.revaks.cyclebuilder.data.formatNumber

private val roundingOptions = listOf(
    Rounding.Auto,
    Rounding.Fixed(2.5),
    Rounding.Fixed(1.0),
    Rounding.Fixed(0.5),
    Rounding.Fixed(0.25),
    Rounding.Fixed(0.1),
)

fun roundingLabel(rounding: Rounding): String = when (rounding) {
    Rounding.Auto -> "Авто"
    is Rounding.Fixed -> "${formatNumber(rounding.step)} кг"
}

@Composable
fun RoundingButton(
    value: Rounding,
    onValueChange: (Rounding) -> Unit,
) {
    var expanded by remember { mutableStateOf(false) }
    Box {
        OutlinedButton(
            onClick = { expanded = true },
            modifier = Modifier.fillMaxWidth(),
        ) {
            Text("Округление: ${roundingLabel(value)}")
        }
        DropdownMenu(expanded = expanded, onDismissRequest = { expanded = false }) {
            roundingOptions.forEach { option ->
                DropdownMenuItem(
                    text = { Text(roundingLabel(option)) },
                    onClick = {
                        onValueChange(option)
                        expanded = false
                    },
                )
            }
        }
    }
}

@Composable
fun ExerciseFormDialog(
    exercise: Exercise?,
    onDismiss: () -> Unit,
    onSave: (
        name: String,
        oneRM: Double?,
        impact: Double,
        multiplier: Double,
        rounding: Rounding,
    ) -> Unit,
) {
    var name by remember(exercise?.id) { mutableStateOf(exercise?.name ?: "") }
    var oneRMText by remember(exercise?.id) {
        mutableStateOf(exercise?.oneRM?.let(::formatNumber) ?: "")
    }
    var impactText by remember(exercise?.id) {
        mutableStateOf(formatNumber(exercise?.impact ?: 1.0))
    }
    var multiplierText by remember(exercise?.id) {
        mutableStateOf(formatNumber(exercise?.multiplier ?: 1.0))
    }
    var rounding by remember(exercise?.id) {
        mutableStateOf(exercise?.rounding ?: Rounding.Auto)
    }

    val oneRM = oneRMText.replace(',', '.').toDoubleOrNull()
    val impact = impactText.replace(',', '.').toDoubleOrNull()
    val multiplier = multiplierText.replace(',', '.').toDoubleOrNull()
    val valid = name.trim().isNotEmpty() &&
        (oneRMText.isBlank() || oneRM != null) &&
        impact != null && impact >= 0.0 &&
        multiplier != null && multiplier > 0.0

    AlertDialog(
        onDismissRequest = onDismiss,
        title = { Text(if (exercise == null) "Новое упражнение" else "Упражнение") },
        text = {
            Column(
                modifier = Modifier.verticalScroll(rememberScrollState()),
                verticalArrangement = Arrangement.spacedBy(8.dp),
            ) {
                NumberField(
                    label = "Название",
                    value = name,
                    onValueChange = { name = it },
                )
                NumberField(
                    label = "1ПМ, кг (можно оставить пустым)",
                    value = oneRMText,
                    onValueChange = { oneRMText = it },
                )
                Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                    NumberField(
                        label = "D — воздействие",
                        value = impactText,
                        onValueChange = { impactText = it },
                        modifier = Modifier.weight(1f),
                    )
                    NumberField(
                        label = "E — множитель",
                        value = multiplierText,
                        onValueChange = { multiplierText = it },
                        modifier = Modifier.weight(1f),
                    )
                }
                Text("Округление рабочего веса", style = androidx.compose.material3.MaterialTheme.typography.labelMedium)
                RoundingButton(rounding) { rounding = it }
            }
        },
        confirmButton = {
            TextButton(
                enabled = valid,
                onClick = {
                    onSave(name.trim(), oneRM, impact ?: 1.0, multiplier ?: 1.0, rounding)
                },
            ) { Text("Сохранить") }
        },
        dismissButton = {
            TextButton(onClick = onDismiss) { Text("Отмена") }
        },
    )
}
