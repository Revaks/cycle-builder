package com.revaks.cyclebuilder.data

import org.junit.Assert.assertEquals
import org.junit.Assert.assertTrue
import org.junit.Test

class ProjectJsonTest {
    private fun seedText(): String =
        checkNotNull(javaClass.classLoader?.getResource("cycle8.seed.json")).readText()

    @Test
    fun `project JSON round trips`() {
        val project = ProjectJson.decode(seedText())
        val decoded = ProjectJson.decode(ProjectJson.encode(project))
        assertEquals(project, decoded)
    }

    @Test
    fun `newer schema version is rejected`() {
        val text = seedText().replace("\"schemaVersion\": 1", "\"schemaVersion\": 2")
        val result = ProjectJson.decodeChecked(text)
        assertTrue(result is ImportResult.Failure)
        assertTrue((result as ImportResult.Failure).message.contains("2"))
    }

    @Test
    fun `broken exercise reference is rejected`() {
        val project = ProjectJson.decode(seedText())
        val broken = project.copy(
            weeks = project.weeks.mapIndexed { index, week ->
                if (index == 0) {
                    week.copy(
                        days = week.days.mapIndexed { dayIndex, day ->
                            if (dayIndex == 0 && day.entries.isNotEmpty()) {
                                day.copy(
                                    entries = day.entries.mapIndexed { entryIndex, entry ->
                                        if (entryIndex == 0) entry.copy(exerciseId = "missing") else entry
                                    },
                                )
                            } else {
                                day
                            }
                        },
                    )
                } else {
                    week
                }
            },
        )
        assertTrue(ProjectJson.decodeChecked(ProjectJson.encode(broken)) is ImportResult.Failure)
    }
}
