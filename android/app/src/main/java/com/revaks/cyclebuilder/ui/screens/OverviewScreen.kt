package com.revaks.cyclebuilder.ui.screens

import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.HorizontalDivider
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.unit.dp
import com.revaks.cyclebuilder.data.formatKg
import com.revaks.cyclebuilder.data.formatMinutes
import com.revaks.cyclebuilder.data.formatNumber
import com.revaks.cyclebuilder.ui.UiState
import com.revaks.cyclebuilder.ui.components.IssueList
import com.revaks.cyclebuilder.ui.components.KpiCard
import com.revaks.cyclebuilder.ui.components.SectionCard

@Composable
fun OverviewScreen(
    state: UiState,
    onOpenWeek: (String) -> Unit,
    modifier: Modifier = Modifier,
) {
    val cycle = state.cycle
    val sessions = cycle.weeks.sumOf { it.days.size }
    val errors = state.issues.count { it.severity == com.revaks.cyclebuilder.data.Severity.ERROR }
    val warnings = state.issues.size - errors

    LazyColumn(
        modifier = modifier.fillMaxSize(),
        contentPadding = androidx.compose.foundation.layout.PaddingValues(16.dp),
        verticalArrangement = Arrangement.spacedBy(12.dp),
    ) {
        item {
            Column {
                Text("Сводка", style = MaterialTheme.typography.labelLarge, color = MaterialTheme.colorScheme.primary)
                Text(
                    "Цикл из ${cycle.weeks.size} недель",
                    style = MaterialTheme.typography.headlineSmall,
                )
                Text(
                    "Программа пересчитывается сразу после изменения 1ПМ или схемы.",
                    style = MaterialTheme.typography.bodyMedium,
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                )
            }
        }
        item {
            Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                KpiCard("Недели", cycle.weeks.size.toString(), Modifier.weight(1f), "$sessions тренировок")
                KpiCard("Тоннаж", "${formatNumber(cycle.tonnage)} кг", Modifier.weight(1f), formatKg(cycle.avgWeight))
            }
        }
        item {
            Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                KpiCard("КПШ", formatNumber(cycle.kpsh.toDouble()), Modifier.weight(1f), "за цикл")
                KpiCard("Время", formatMinutes(cycle.timeMinutes), Modifier.weight(1f), "по методу Бондаренко")
            }
        }
        item {
            Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                KpiCard("Фунтиков", formatNumber(cycle.funtikov), Modifier.weight(1f), "интенсивность")
                KpiCard(
                    "Проверка",
                    if (errors > 0) "$errors ошибок" else "ОК",
                    Modifier.weight(1f),
                    "$warnings предупреждений",
                )
            }
        }
        item {
            SectionCard("Тоннаж по неделям") {
                val max = cycle.weeks.maxOfOrNull { it.tonnage }?.takeIf { it > 0 } ?: 1.0
                Row(
                    modifier = Modifier.fillMaxWidth().height(120.dp),
                    horizontalArrangement = Arrangement.spacedBy(4.dp),
                    verticalAlignment = Alignment.Bottom,
                ) {
                    cycle.weeks.forEach { week ->
                        Column(
                            modifier = Modifier.weight(1f),
                            horizontalAlignment = Alignment.CenterHorizontally,
                        ) {
                            androidx.compose.foundation.layout.Box(
                                Modifier
                                    .fillMaxWidth()
                                    .height((8 + 88 * (week.tonnage / max)).dp)
                                    .clip(RoundedCornerShape(topStart = 5.dp, topEnd = 5.dp))
                                    .background(
                                        if (week.isDeload) {
                                            Color(0xFFC98C3A)
                                        } else {
                                            MaterialTheme.colorScheme.primary
                                        },
                                    ),
                            )
                        }
                    }
                }
            }
        }
        item {
            IssueList(state.issues)
        }
        item {
            SectionCard("Недели", subtitle = "Нажмите на неделю, чтобы открыть редактор") {
                cycle.weeks.forEachIndexed { index, week ->
                    Row(
                        modifier = Modifier
                            .fillMaxWidth()
                            .clickable { onOpenWeek(week.weekId) }
                            .padding(vertical = 8.dp),
                        horizontalArrangement = Arrangement.SpaceBetween,
                    ) {
                        Column(Modifier.weight(1f)) {
                            Text(week.label, style = MaterialTheme.typography.titleSmall)
                            Text(
                                "${formatNumber(week.tonnage)} кг · ${week.kpsh} КПШ · ${formatMinutes(week.timeMinutes)}",
                                style = MaterialTheme.typography.bodySmall,
                                color = MaterialTheme.colorScheme.onSurfaceVariant,
                            )
                        }
                        if (week.isDeload) {
                            Text(
                                "разгрузка",
                                color = Color(0xFF9A641F),
                                style = MaterialTheme.typography.labelSmall,
                            )
                        }
                    }
                    if (index < cycle.weeks.lastIndex) HorizontalDivider()
                }
            }
        }
    }
}

