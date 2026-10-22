package com.revaks.cyclebuilder.ui.screens

import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.itemsIndexed
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.outlined.FileDownload
import androidx.compose.material.icons.outlined.FileUpload
import androidx.compose.material.icons.outlined.PictureAsPdf
import androidx.compose.material.icons.outlined.RestartAlt
import androidx.compose.material3.DropdownMenu
import androidx.compose.material3.DropdownMenuItem
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.unit.dp
import com.revaks.cyclebuilder.data.TimeThreshold
import com.revaks.cyclebuilder.data.formatNumber
import com.revaks.cyclebuilder.export.PdfExporter
import com.revaks.cyclebuilder.ui.CycleBuilderViewModel
import com.revaks.cyclebuilder.ui.UiState
import com.revaks.cyclebuilder.ui.components.ConfirmDialog
import com.revaks.cyclebuilder.ui.components.IssueList
import com.revaks.cyclebuilder.ui.components.NumberField
import com.revaks.cyclebuilder.ui.components.RoundingButton
import com.revaks.cyclebuilder.ui.components.SectionCard

private val progressionModes = listOf("compound" to "Сложный процент", "linear" to "Линейный", "none" to "Без прогрессии")
private val deloadModes = listOf("hold" to "Держать 1ПМ", "reduce" to "Уменьшить 1ПМ")

@Composable
private fun SelectionButton(
    label: String,
    value: String,
    options: List<Pair<String, String>>,
    onSelect: (String) -> Unit,
) {
    var expanded by remember { mutableStateOf(false) }
    Box {
        OutlinedButton(
            onClick = { expanded = true },
            modifier = Modifier.fillMaxWidth(),
        ) {
            Text("$label: ${options.firstOrNull { it.first == value }?.second ?: value}")
        }
        DropdownMenu(expanded = expanded, onDismissRequest = { expanded = false }) {
            options.forEach { (id, title) ->
                DropdownMenuItem(
                    text = { Text(title) },
                    onClick = {
                        onSelect(id)
                        expanded = false
                    },
                )
            }
        }
    }
}

@Composable
fun SettingsScreen(
    state: UiState,
    viewModel: CycleBuilderViewModel,
    modifier: Modifier = Modifier,
) {
    val context = LocalContext.current
    val project = state.project
    var showReset by remember { mutableStateOf(false) }
    var showFuntikov by remember { mutableStateOf(false) }

    val createJson = rememberLauncherForActivityResult(
        ActivityResultContracts.CreateDocument("application/json"),
    ) { uri ->
        if (uri != null) {
            context.contentResolver.openOutputStream(uri)?.use { output ->
                output.write(viewModel.exportJson().toByteArray())
            }
        }
    }
    val openJson = rememberLauncherForActivityResult(ActivityResultContracts.OpenDocument()) { uri ->
        if (uri != null) {
            val text = context.contentResolver.openInputStream(uri)?.bufferedReader()?.use { it.readText() }
            if (text != null) viewModel.importJson(text)
        }
    }

    LazyColumn(
        modifier = modifier.fillMaxSize(),
        contentPadding = PaddingValues(16.dp),
        verticalArrangement = Arrangement.spacedBy(12.dp),
    ) {
        item {
            Column {
                Text(
                    "Настройки",
                    style = MaterialTheme.typography.labelLarge,
                    color = MaterialTheme.colorScheme.primary,
                )
                Text("Параметры цикла", style = MaterialTheme.typography.headlineSmall)
                Text(
                    "Изменения сохраняются автоматически в памяти приложения.",
                    style = MaterialTheme.typography.bodyMedium,
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                )
            }
        }
        item { IssueList(state.issues) }
        item {
            SectionCard("Проект") {
                NumberField(
                    label = "Название проекта",
                    value = project.name,
                    onValueChange = viewModel::setProjectName,
                )
                Text(
                    "Округление новых упражнений",
                    style = MaterialTheme.typography.labelMedium,
                    modifier = Modifier.padding(top = 10.dp, bottom = 6.dp),
                )
                RoundingButton(project.defaultRounding) { viewModel.setDefaultRounding(it) }
            }
        }
        item {
            SectionCard("Прогрессия") {
                SelectionButton(
                    label = "Режим",
                    value = project.progression.mode,
                    options = progressionModes,
                    onSelect = {
                        viewModel.setProgression(
                            it,
                            project.progression.stepPercent,
                            project.progression.deload.mode,
                            project.progression.deload.reductionPercent,
                        )
                    },
                )
                NumberField(
                    label = "Шаг за неделю, %",
                    value = formatNumber(project.progression.stepPercent),
                    onValueChange = {
                        val value = it.replace(',', '.').toDoubleOrNull()
                        if (value != null) {
                            viewModel.setProgression(
                                project.progression.mode,
                                value,
                                project.progression.deload.mode,
                                project.progression.deload.reductionPercent,
                            )
                        }
                    },
                    modifier = Modifier.padding(top = 8.dp),
                )
                Text(
                    "Разгрузка",
                    style = MaterialTheme.typography.labelMedium,
                    modifier = Modifier.padding(top = 10.dp, bottom = 6.dp),
                )
                SelectionButton(
                    label = "Режим",
                    value = project.progression.deload.mode,
                    options = deloadModes,
                    onSelect = {
                        viewModel.setProgression(
                            project.progression.mode,
                            project.progression.stepPercent,
                            it,
                            project.progression.deload.reductionPercent,
                        )
                    },
                )
                NumberField(
                    label = "Уменьшение 1ПМ на разгрузке, %",
                    value = formatNumber(project.progression.deload.reductionPercent),
                    onValueChange = {
                        val value = it.replace(',', '.').toDoubleOrNull()
                        if (value != null) {
                            viewModel.setProgression(
                                project.progression.mode,
                                project.progression.stepPercent,
                                project.progression.deload.mode,
                                value,
                            )
                        }
                    },
                    modifier = Modifier.padding(top = 8.dp),
                )
            }
        }
        item {
            SectionCard("Данные", subtitle = "JSON переносит проект между устройствами") {
                Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                    OutlinedButton(onClick = { createJson.launch("cycle-builder-backup.json") }) {
                        Icon(Icons.Outlined.FileDownload, contentDescription = null)
                        Text("Скачать JSON")
                    }
                    OutlinedButton(
                        onClick = { openJson.launch(arrayOf("application/json", "text/*")) },
                    ) {
                        Icon(Icons.Outlined.FileUpload, contentDescription = null)
                        Text("Импорт")
                    }
                }
                Row(
                    modifier = Modifier.padding(top = 8.dp),
                    horizontalArrangement = Arrangement.spacedBy(8.dp),
                ) {
                    OutlinedButton(
                        onClick = { PdfExporter.sharePdf(context, project, state.cycle) },
                    ) {
                        Icon(Icons.Outlined.PictureAsPdf, contentDescription = null)
                        Text("PDF / поделиться")
                    }
                }
            }
        }
        item {
            SectionCard("Метрики", subtitle = "Коэффициенты времени, D и Фунтикова") {
                Text("Пороги времени", style = MaterialTheme.typography.labelLarge)
                project.metrics.timeThresholds.forEachIndexed { index, threshold ->
                    Row(
                        modifier = Modifier.padding(top = 6.dp),
                        horizontalArrangement = Arrangement.spacedBy(8.dp),
                        verticalAlignment = Alignment.CenterVertically,
                    ) {
                        NumberField(
                            label = "Ниже %",
                            value = formatNumber(threshold.belowPercent),
                            onValueChange = {
                                val value = it.replace(',', '.').toDoubleOrNull()
                                if (value != null) {
                                    viewModel.updateTimeThreshold(
                                        index,
                                        threshold.copy(belowPercent = value),
                                    )
                                }
                            },
                            modifier = Modifier.weight(1f),
                        )
                        NumberField(
                            label = "Фактор",
                            value = formatNumber(threshold.factor),
                            onValueChange = {
                                val value = it.replace(',', '.').toDoubleOrNull()
                                if (value != null) {
                                    viewModel.updateTimeThreshold(
                                        index,
                                        threshold.copy(factor = value),
                                    )
                                }
                            },
                            modifier = Modifier.weight(1f),
                        )
                    }
                }
                NumberField(
                    label = "Фактор времени по умолчанию",
                    value = formatNumber(project.metrics.timeFallbackFactor),
                    onValueChange = {
                        it.replace(',', '.').toDoubleOrNull()?.let(viewModel::updateTimeFallback)
                    },
                    modifier = Modifier.padding(top = 8.dp),
                )
                Text(
                    "Факторы воздействия",
                    style = MaterialTheme.typography.labelLarge,
                    modifier = Modifier.padding(top = 14.dp),
                )
                Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                    NumberField(
                        label = "Тяжёлый порог",
                        value = formatNumber(project.metrics.impactHeavyThreshold),
                        onValueChange = { text ->
                            text.replace(',', '.').toDoubleOrNull()?.let { value ->
                                viewModel.updateImpactFactors(
                                    value,
                                    project.metrics.impactLightThreshold,
                                    project.metrics.impactHeavyFactor,
                                    project.metrics.impactMediumFactor,
                                    project.metrics.impactLightFactor,
                                )
                            }
                        },
                        modifier = Modifier.weight(1f),
                    )
                    NumberField(
                        label = "Лёгкий порог",
                        value = formatNumber(project.metrics.impactLightThreshold),
                        onValueChange = { text ->
                            text.replace(',', '.').toDoubleOrNull()?.let { value ->
                                viewModel.updateImpactFactors(
                                    project.metrics.impactHeavyThreshold,
                                    value,
                                    project.metrics.impactHeavyFactor,
                                    project.metrics.impactMediumFactor,
                                    project.metrics.impactLightFactor,
                                )
                            }
                        },
                        modifier = Modifier.weight(1f),
                    )
                }
                Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                    NumberField(
                        label = "Фактор тяж.",
                        value = formatNumber(project.metrics.impactHeavyFactor),
                        onValueChange = { text ->
                            text.replace(',', '.').toDoubleOrNull()?.let { value ->
                                viewModel.updateImpactFactors(
                                    project.metrics.impactHeavyThreshold,
                                    project.metrics.impactLightThreshold,
                                    value,
                                    project.metrics.impactMediumFactor,
                                    project.metrics.impactLightFactor,
                                )
                            }
                        },
                        modifier = Modifier.weight(1f),
                    )
                    NumberField(
                        label = "Фактор ср.",
                        value = formatNumber(project.metrics.impactMediumFactor),
                        onValueChange = { text ->
                            text.replace(',', '.').toDoubleOrNull()?.let { value ->
                                viewModel.updateImpactFactors(
                                    project.metrics.impactHeavyThreshold,
                                    project.metrics.impactLightThreshold,
                                    project.metrics.impactHeavyFactor,
                                    value,
                                    project.metrics.impactLightFactor,
                                )
                            }
                        },
                        modifier = Modifier.weight(1f),
                    )
                    NumberField(
                        label = "Фактор лёг.",
                        value = formatNumber(project.metrics.impactLightFactor),
                        onValueChange = { text ->
                            text.replace(',', '.').toDoubleOrNull()?.let { value ->
                                viewModel.updateImpactFactors(
                                    project.metrics.impactHeavyThreshold,
                                    project.metrics.impactLightThreshold,
                                    project.metrics.impactHeavyFactor,
                                    project.metrics.impactMediumFactor,
                                    value,
                                )
                            }
                        },
                        modifier = Modifier.weight(1f),
                    )
                }
                TextButton(onClick = { showFuntikov = !showFuntikov }) {
                    Text(if (showFuntikov) "Скрыть таблицу Фунтикова" else "Таблица Фунтикова (101)")
                }
            }
        }
        if (showFuntikov) {
            item {
                SectionCard("Таблица Фунтикова") {
                    Text(
                        "Индекс 0 хранится для совместимости и в расчёте не используется.",
                        style = MaterialTheme.typography.bodySmall,
                        color = MaterialTheme.colorScheme.onSurfaceVariant,
                    )
                }
            }
            itemsIndexed(project.metrics.funtikovTable) { index, value ->
                Row(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(horizontal = 4.dp, vertical = 2.dp),
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.spacedBy(10.dp),
                ) {
                    Text("$index%", modifier = Modifier.width(42.dp))
                    OutlinedTextField(
                        value = formatNumber(value),
                        onValueChange = {
                            it.replace(',', '.').toDoubleOrNull()?.let { next ->
                                viewModel.updateFuntikov(index, next)
                            }
                        },
                        singleLine = true,
                        modifier = Modifier.weight(1f),
                    )
                }
            }
        }
        item {
            SectionCard("Сброс") {
                OutlinedButton(onClick = { showReset = true }) {
                    Icon(Icons.Outlined.RestartAlt, contentDescription = null)
                    Text("Сбросить к шаблону cycle8")
                }
            }
        }
    }

    ConfirmDialog(
        open = showReset,
        title = "Сбросить проект?",
        message = "Все изменения будут потеряны. Сначала сохраните JSON-копию, если она нужна.",
        confirmLabel = "Сбросить",
        onConfirm = {
            viewModel.resetToSeed()
            showReset = false
        },
        onDismiss = { showReset = false },
    )
}
