package com.revaks.cyclebuilder.data

import kotlinx.serialization.decodeFromString
import kotlinx.serialization.encodeToString
import kotlinx.serialization.json.Json
import kotlinx.serialization.json.intOrNull
import kotlinx.serialization.json.jsonObject
import kotlinx.serialization.json.jsonPrimitive

object ProjectJson {
    val json = Json {
        prettyPrint = true
        ignoreUnknownKeys = true
        encodeDefaults = true
        explicitNulls = true
    }

    fun encode(project: Project): String = json.encodeToString(project)

    fun decode(text: String): Project = json.decodeFromString(text)

    fun decodeChecked(text: String): ImportResult {
        val root = try {
            json.parseToJsonElement(text).jsonObject
        } catch (error: Exception) {
            return ImportResult.Failure("Файл не является корректным JSON")
        }
        val version = root["schemaVersion"]?.jsonPrimitive?.intOrNull
        if (version != null && version != 1) {
            return ImportResult.Failure(
                "Неподдерживаемая версия схемы: $version. Ожидается версия 1.",
            )
        }
        val project = try {
            json.decodeFromJsonElement(Project.serializer(), root)
        } catch (error: Exception) {
            return ImportResult.Failure(
                "Файл не похож на проект конструктора цикла: ${error.message ?: "неизвестная ошибка"}",
            )
        }
        val issues = validateProject(project)
        if (issues.any { it.severity == Severity.ERROR }) {
            return ImportResult.Failure(
                "В проекте есть ошибки: ${issues.first { it.severity == Severity.ERROR }.message}",
            )
        }
        return ImportResult.Success(project)
    }
}

sealed interface ImportResult {
    data class Success(val project: Project) : ImportResult
    data class Failure(val message: String) : ImportResult
}
