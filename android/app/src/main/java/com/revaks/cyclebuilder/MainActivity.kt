package com.revaks.cyclebuilder

import android.graphics.Color
import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.activity.SystemBarStyle
import androidx.activity.enableEdgeToEdge
import androidx.lifecycle.viewmodel.compose.viewModel
import com.revaks.cyclebuilder.ui.CycleBuilderApp
import com.revaks.cyclebuilder.ui.CycleBuilderTheme
import com.revaks.cyclebuilder.ui.CycleBuilderViewModel

class MainActivity : ComponentActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        enableEdgeToEdge(
            statusBarStyle = SystemBarStyle.light(Color.TRANSPARENT, Color.TRANSPARENT),
            navigationBarStyle = SystemBarStyle.light(Color.TRANSPARENT, Color.TRANSPARENT),
        )
        setContent {
            CycleBuilderTheme {
                val viewModel: CycleBuilderViewModel = viewModel()
                CycleBuilderApp(viewModel)
            }
        }
    }
}
