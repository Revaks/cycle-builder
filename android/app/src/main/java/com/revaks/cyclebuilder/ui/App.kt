package com.revaks.cyclebuilder.ui

import androidx.compose.foundation.layout.padding

import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.outlined.Dashboard
import androidx.compose.material.icons.outlined.FitnessCenter
import androidx.compose.material.icons.outlined.PictureAsPdf
import androidx.compose.material.icons.outlined.Settings
import androidx.compose.material.icons.outlined.ViewList
import androidx.compose.material3.CenterAlignedTopAppBar
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.NavigationBar
import androidx.compose.material3.NavigationBarItem
import androidx.compose.material3.Scaffold
import androidx.compose.material3.SnackbarHost
import androidx.compose.material3.SnackbarHostState
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.runtime.setValue
import androidx.compose.ui.platform.LocalContext
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import com.revaks.cyclebuilder.export.PdfExporter
import com.revaks.cyclebuilder.ui.screens.ExercisesScreen
import com.revaks.cyclebuilder.ui.screens.OverviewScreen
import com.revaks.cyclebuilder.ui.screens.ProgramScreen
import com.revaks.cyclebuilder.ui.screens.SettingsScreen

private data class Tab(
    val id: String,
    val label: String,
    val icon: androidx.compose.ui.graphics.vector.ImageVector,
)

private val tabs = listOf(
    Tab("overview", "Обзор", Icons.Outlined.Dashboard),
    Tab("program", "Программа", Icons.Outlined.ViewList),
    Tab("exercises", "Упражнения", Icons.Outlined.FitnessCenter),
    Tab("settings", "Настройки", Icons.Outlined.Settings),
)

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun CycleBuilderApp(viewModel: CycleBuilderViewModel) {
    val state by viewModel.state.collectAsStateWithLifecycle()
    val context = LocalContext.current
    val snackbar = remember { SnackbarHostState() }
    var selectedTab by rememberSaveable { mutableStateOf("overview") }

    LaunchedEffect(viewModel) {
        viewModel.messages.collect { message ->
            snackbar.showSnackbar(message)
        }
    }

    Scaffold(
        topBar = {
            CenterAlignedTopAppBar(
                title = { Text("Конструктор цикла") },
                actions = {
                    IconButton(
                        onClick = {
                            PdfExporter.sharePdf(context, state.project, state.cycle)
                        },
                    ) {
                        Icon(Icons.Outlined.PictureAsPdf, contentDescription = "PDF")
                    }
                },
            )
        },
        snackbarHost = { SnackbarHost(snackbar) },
        bottomBar = {
            NavigationBar {
                tabs.forEach { tab ->
                    NavigationBarItem(
                        selected = selectedTab == tab.id,
                        onClick = { selectedTab = tab.id },
                        icon = { Icon(tab.icon, contentDescription = tab.label) },
                        label = { Text(tab.label) },
                    )
                }
            }
        },
    ) { padding ->
        when (selectedTab) {
            "overview" -> OverviewScreen(
                state = state,
                onOpenWeek = { weekId ->
                    viewModel.selectWeek(weekId)
                    selectedTab = "program"
                },
                modifier = androidx.compose.ui.Modifier.padding(padding),
            )
            "program" -> ProgramScreen(
                state = state,
                viewModel = viewModel,
                modifier = androidx.compose.ui.Modifier.padding(padding),
            )
            "exercises" -> ExercisesScreen(
                state = state,
                viewModel = viewModel,
                modifier = androidx.compose.ui.Modifier.padding(padding),
            )
            else -> SettingsScreen(
                state = state,
                viewModel = viewModel,
                modifier = androidx.compose.ui.Modifier.padding(padding),
            )
        }
    }
}
