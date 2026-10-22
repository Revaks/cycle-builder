package com.revaks.cyclebuilder.data

import android.content.Context
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.sync.Mutex
import kotlinx.coroutines.sync.withLock
import kotlinx.coroutines.withContext
import java.io.File

object SeedLoader {
    fun load(context: Context): Project = context.assets.open("cycle8.seed.json").use { input ->
        ProjectJson.decode(input.bufferedReader().readText())
    }
}

class ProjectRepository(private val context: Context) {
    private val projectFile = File(context.filesDir, "project.json")
    private val saveMutex = Mutex()

    fun load(): Project {
        val seed = SeedLoader.load(context)
        if (!projectFile.exists()) return seed
        return try {
            val project = ProjectJson.decode(projectFile.readText())
            if (hasBlockingErrors(validateProject(project))) seed else project
        } catch (_: Exception) {
            seed
        }
    }

    suspend fun save(project: Project) {
        withContext(Dispatchers.IO) {
            saveMutex.withLock {
                val temp = File(context.filesDir, "project.json.tmp")
                temp.writeText(ProjectJson.encode(project))
                if (!temp.renameTo(projectFile)) {
                    projectFile.writeText(temp.readText())
                    temp.delete()
                }
            }
        }
    }
}
