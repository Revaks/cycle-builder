package com.revaks.cyclebuilder.ui

import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Typography
import androidx.compose.material3.lightColorScheme
import androidx.compose.runtime.Composable
import androidx.compose.ui.graphics.Color

private val CycleColors = lightColorScheme(
    primary = Color(0xFF3F6B4F),
    onPrimary = Color.White,
    primaryContainer = Color(0xFFDCEBDD),
    onPrimaryContainer = Color(0xFF17201B),
    secondary = Color(0xFF60705F),
    onSecondary = Color.White,
    background = Color(0xFFF7F8F4),
    onBackground = Color(0xFF17201B),
    surface = Color.White,
    onSurface = Color(0xFF17201B),
    surfaceVariant = Color(0xFFEDF0EA),
    onSurfaceVariant = Color(0xFF4F5C52),
    outline = Color(0xFFCBD2C9),
    error = Color(0xFFA23B32),
)

@Composable
fun CycleBuilderTheme(content: @Composable () -> Unit) {
    MaterialTheme(
        colorScheme = CycleColors,
        typography = Typography(),
        content = content,
    )
}
