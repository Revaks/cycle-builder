package com.revaks.cyclebuilder.data

import kotlinx.serialization.KSerializer
import kotlinx.serialization.SerialName
import kotlinx.serialization.Serializable
import kotlinx.serialization.descriptors.PrimitiveKind
import kotlinx.serialization.descriptors.PrimitiveSerialDescriptor
import kotlinx.serialization.descriptors.SerialDescriptor
import kotlinx.serialization.encoding.Decoder
import kotlinx.serialization.encoding.Encoder
import kotlinx.serialization.json.JsonDecoder
import kotlinx.serialization.json.jsonPrimitive

@Serializable(with = RoundingSerializer::class)
sealed class Rounding {
    data object Auto : Rounding()
    data class Fixed(val step: Double) : Rounding()
}

object RoundingSerializer : KSerializer<Rounding> {
    override val descriptor: SerialDescriptor =
        PrimitiveSerialDescriptor("Rounding", PrimitiveKind.STRING)

    override fun serialize(encoder: Encoder, value: Rounding) {
        when (value) {
            Rounding.Auto -> encoder.encodeString("auto")
            is Rounding.Fixed -> encoder.encodeDouble(value.step)
        }
    }

    override fun deserialize(decoder: Decoder): Rounding {
        val jsonDecoder = decoder as JsonDecoder
        val value = jsonDecoder.decodeJsonElement().jsonPrimitive
        return if (value.isString && value.content == "auto") {
            Rounding.Auto
        } else {
            Rounding.Fixed(value.content.toDoubleOrNull() ?: 1.0)
        }
    }
}

@Serializable
data class Exercise(
    val id: String,
    val name: String,
    val oneRM: Double? = null,
    val impact: Double = 1.0,
    val multiplier: Double = 1.0,
    val rounding: Rounding = Rounding.Auto,
    val note: String? = null,
)

@Serializable
data class DayTemplate(
    val id: String,
    val name: String,
)

@Serializable
data class SetGroup(
    val id: String,
    val percent: Double,
    val reps: Int,
    val sets: Int,
)

@Serializable
data class Entry(
    val id: String,
    val exerciseId: String,
    val groups: List<SetGroup> = emptyList(),
)

@Serializable
data class WeekDay(
    val dayTemplateId: String,
    val entries: List<Entry> = emptyList(),
)

@Serializable
data class Week(
    val id: String,
    val label: String,
    val isDeload: Boolean = false,
    val days: List<WeekDay> = emptyList(),
)

@Serializable
data class DeloadConfig(
    val mode: String = "hold",
    val reductionPercent: Double = 10.0,
)

@Serializable
data class ProgressionConfig(
    val mode: String = "compound",
    val stepPercent: Double = 1.0,
    val deload: DeloadConfig = DeloadConfig(),
)

@Serializable
data class TimeThreshold(
    val belowPercent: Double,
    val factor: Double,
)

@Serializable
data class MetricsConfig(
    val funtikovTable: List<Double> = emptyList(),
    val timeThresholds: List<TimeThreshold> = emptyList(),
    val timeFallbackFactor: Double = 1.2,
    val impactHeavyThreshold: Double = 0.8,
    val impactLightThreshold: Double = 0.4,
    val impactHeavyFactor: Double = 6.0,
    val impactMediumFactor: Double = 3.0,
    val impactLightFactor: Double = 1.5,
)

@Serializable
data class Project(
    val schemaVersion: Int = 1,
    val id: String,
    val name: String,
    val createdAt: String,
    val updatedAt: String,
    val unit: String = "kg",
    val defaultRounding: Rounding = Rounding.Auto,
    val exercises: List<Exercise> = emptyList(),
    val dayTemplates: List<DayTemplate> = emptyList(),
    val weeks: List<Week> = emptyList(),
    val progression: ProgressionConfig = ProgressionConfig(),
    val metrics: MetricsConfig = MetricsConfig(),
)

// Computed model -------------------------------------------------------------

data class ComputedGroup(
    val group: SetGroup,
    val weight: Double?,
    val tonnage: Double?,
    val kpsh: Int,
    val funtikov: Double?,
    val timeMinutes: Double,
)

data class ComputedEntry(
    val entry: Entry,
    val exercise: Exercise,
    val oneRM: Double?,
    val groups: List<ComputedGroup>,
    val tonnage: Double,
    val kpsh: Int,
    val weightedKpsh: Int,
    val funtikov: Double,
    val timeMinutes: Double,
    val avgWeight: Double?,
    val relativeIntensity: Double?,
    val hasMissingOneRM: Boolean,
)

data class ComputedDay(
    val dayTemplateId: String,
    val dayName: String,
    val entries: List<ComputedEntry>,
    val tonnage: Double,
    val kpsh: Int,
    val weightedKpsh: Int,
    val funtikov: Double,
    val timeMinutes: Int,
    val avgWeight: Double?,
)

data class ComputedWeek(
    val weekId: String,
    val label: String,
    val isDeload: Boolean,
    val oneRMByExercise: Map<String, Double?>,
    val days: List<ComputedDay>,
    val tonnage: Double,
    val kpsh: Int,
    val weightedKpsh: Int,
    val funtikov: Double,
    val timeMinutes: Int,
    val avgWeight: Double?,
)

data class ComputedCycle(
    val weeks: List<ComputedWeek>,
    val tonnage: Double,
    val kpsh: Int,
    val weightedKpsh: Int,
    val funtikov: Double,
    val timeMinutes: Int,
    val avgWeight: Double?,
)

enum class Severity { ERROR, WARNING }

data class Issue(
    val severity: Severity,
    val code: String,
    val message: String,
    val weekId: String? = null,
    val dayTemplateId: String? = null,
    val entryId: String? = null,
    val exerciseId: String? = null,
    val groupId: String? = null,
)
