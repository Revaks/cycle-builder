package com.revaks.cyclebuilder.domain

import com.revaks.cyclebuilder.data.Project
import com.revaks.cyclebuilder.data.ProjectJson
import kotlinx.serialization.Serializable
import org.junit.Assert.assertEquals
import org.junit.Assert.assertNull
import org.junit.Assert.assertTrue
import org.junit.Test

class CalculationsTest {
    private val seed: Project by lazy {
        ProjectJson.decode(resource("cycle8.seed.json"))
    }

    private fun resource(name: String): String =
        checkNotNull(javaClass.classLoader?.getResource(name)) { "Missing $name" }.readText()

    @Test
    fun `week 1 matches the xlsm reference row`() {
        val cycle = calculateCycle(seed)
        val press = cycle.weeks[0].days[0].entries[0]
        assertEquals(listOf(32.5, 42.5, 50.0), press.groups.map { it.weight })
        assertEquals(2040.0, press.tonnage, 0.001)
        assertEquals(48, press.kpsh)
        assertEquals(23.4, press.timeMinutes, 0.001)
        assertEquals(972.7, press.funtikov, 0.01)
        assertEquals(42.5, press.avgWeight ?: 0.0, 0.001)
        assertEquals(0.4722, press.relativeIntensity ?: 0.0, 0.001)
    }

    @Test
    fun `week 1 totals and day times match the xlsm`() {
        val week = calculateCycle(seed).weeks[0]
        assertEquals(39304.0, week.tonnage, 0.001)
        assertEquals(818, week.kpsh)
        assertEquals(17762.032, week.funtikov, 0.01)
        assertEquals(278, week.timeMinutes)
        assertEquals(listOf(101, 91, 86), week.days.map { it.timeMinutes })
    }

    @Test
    fun `funtikov boundaries use the documented table indexes`() {
        val table = seed.metrics.funtikovTable
        assertEquals(table[33], funtikovCoefficient(30.0, table), 0.0)
        assertEquals(table[38], funtikovCoefficient(35.0, table), 0.0)
        assertEquals(table[43], funtikovCoefficient(40.0, table), 0.0)
        assertEquals(table[48], funtikovCoefficient(45.0, table), 0.0)
        assertEquals(table[48], funtikovCoefficient(49.99, table), 0.0)
        assertEquals(table[50], funtikovCoefficient(50.0, table), 0.0)
        assertEquals(table[50], funtikovCoefficient(50.5, table), 0.0)
        assertEquals(0.0, funtikovCoefficient(29.99, table), 0.0)
    }

    @Test
    fun `deload does not shift the following trend`() {
        val progression = seed.progression
        assertEquals(90.9, trendOneRM(90.0, 2, progression), 0.0001)
        assertEquals(92.72709, trendOneRM(90.0, 4, progression), 0.0001)
        assertEquals(90.0, effectiveOneRM(90.0, 1, progression, true), 0.0001)
        assertEquals(90.0, effectiveOneRM(90.0, 2, progression, true), 0.0001)
        assertEquals(81.0, effectiveOneRM(90.0, 2, progression.copy(deload = progression.deload.copy(mode = "reduce")), true), 0.0001)
    }

    @Test
    fun `missing one rep max keeps kpsh and time but removes weight metrics`() {
        val broken = seed.copy(
            exercises = seed.exercises.mapIndexed { index, exercise ->
                if (index == 0) exercise.copy(oneRM = null) else exercise
            },
        )
        val cycle = calculateCycle(broken)
        val entry = cycle.weeks[0].days[0].entries[0]
        assertTrue(entry.hasMissingOneRM)
        assertNull(entry.groups[0].weight)
        assertEquals(0.0, entry.tonnage, 0.0)
        assertEquals(48, entry.kpsh)
        assertEquals(0, entry.weightedKpsh)
        assertNull(entry.avgWeight)
        assertNull(entry.relativeIntensity)
        assertEquals(23.4, entry.timeMinutes, 0.001)
    }

    @Test
    fun `empty day and zero time factors return zero time`() {
        val empty = seed.copy(
            weeks = seed.weeks.mapIndexed { index, week ->
                if (index == 0) {
                    week.copy(days = week.days.mapIndexed { dayIndex, day ->
                        if (dayIndex == 0) day.copy(entries = emptyList()) else day
                    })
                } else {
                    week
                }
            },
        )
        assertEquals(0, calculateCycle(empty).weeks[0].days[0].timeMinutes)

        val zeroTime = seed.copy(
            metrics = seed.metrics.copy(
                timeThresholds = seed.metrics.timeThresholds.map { it.copy(factor = 0.0) },
                timeFallbackFactor = 0.0,
            ),
        )
        assertEquals(0, calculateCycle(zeroTime).weeks[0].days[0].timeMinutes)
    }

    @Test
    fun `cycle8 fidelity across every row and day total`() {
        val cycle = calculateCycle(seed)
        val expected = ProjectJson.json.decodeFromString<ExpectedFile>(
            resource("cycle8.expected.json"),
        )
        assertEquals(12, cycle.weeks.size)
        assertEquals(12, expected.weeks.size)

        var days = 0
        var entries = 0
        var groups = 0
        expected.weeks.forEach { expectedWeek ->
            val week = cycle.weeks.first { it.weekId == expectedWeek.weekId }
            assertEquals(expectedWeek.tonnage, week.tonnage, 0.01)
            assertEquals(expectedWeek.kpsh, week.kpsh.toDouble(), 0.0)
            assertEquals(expectedWeek.funtikov, week.funtikov, 0.01)
            assertEquals(expectedWeek.timeMinutes, week.timeMinutes.toDouble(), 0.0)
            assertEquals(3, week.days.size)

            expectedWeek.days.forEach { expectedDay ->
                val day = week.days.first { it.dayTemplateId == expectedDay.dayTemplateId }
                days += 1
                assertEquals(expectedDay.entries.size, day.entries.size)
                assertEquals(expectedDay.tonnage, day.tonnage, 0.01)
                assertEquals(expectedDay.kpsh, day.kpsh.toDouble(), 0.0)
                assertEquals(expectedDay.funtikov, day.funtikov, 0.01)
                assertEquals(expectedDay.timeMinutes, day.timeMinutes.toDouble(), 0.0)

                expectedDay.entries.forEach { expectedEntry ->
                    val entry = day.entries.first { it.entry.id == expectedEntry.entryId }
                    entries += 1
                    groups += entry.groups.size
                    assertEquals(
                        expectedEntry.groups.map { it.weight },
                        entry.groups.map { it.weight },
                    )
                    assertEquals(expectedEntry.tonnage, entry.tonnage, 0.01)
                    assertEquals(expectedEntry.kpsh, entry.kpsh.toDouble(), 0.0)
                    assertEquals(expectedEntry.funtikov, entry.funtikov, 0.01)
                    assertEquals(expectedEntry.timeMinutes, entry.timeMinutes, 0.01)
                    assertEquals(expectedEntry.avgWeight, entry.avgWeight ?: 0.0, 0.01)
                    assertEquals(
                        expectedEntry.relativeIntensity,
                        entry.relativeIntensity ?: 0.0,
                        0.01,
                    )
                }
            }
        }
        assertEquals(36, days)
        assertEquals(216, entries)
        assertEquals(376, groups)
    }
}

@Serializable
private data class ExpectedFile(val weeks: List<ExpectedWeek>)

@Serializable
private data class ExpectedWeek(
    val weekId: String,
    val tonnage: Double,
    val kpsh: Double,
    val funtikov: Double,
    val timeMinutes: Double,
    val days: List<ExpectedDay>,
)

@Serializable
private data class ExpectedDay(
    val dayTemplateId: String,
    val tonnage: Double,
    val kpsh: Double,
    val funtikov: Double,
    val timeMinutes: Double,
    val entries: List<ExpectedEntry>,
)

@Serializable
private data class ExpectedEntry(
    val entryId: String,
    val groups: List<ExpectedGroup>,
    val tonnage: Double,
    val kpsh: Double,
    val funtikov: Double,
    val timeMinutes: Double,
    val avgWeight: Double,
    val relativeIntensity: Double,
)

@Serializable
private data class ExpectedGroup(val weight: Double?)
