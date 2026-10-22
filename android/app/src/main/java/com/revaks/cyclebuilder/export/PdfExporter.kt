package com.revaks.cyclebuilder.export

import android.content.ClipData
import android.content.Context
import android.content.Intent
import android.graphics.Canvas
import android.graphics.Paint
import android.graphics.Typeface
import android.graphics.pdf.PdfDocument
import androidx.core.content.FileProvider
import com.revaks.cyclebuilder.data.ComputedCycle
import com.revaks.cyclebuilder.data.Project
import com.revaks.cyclebuilder.data.formatKg
import com.revaks.cyclebuilder.data.formatMinutes
import com.revaks.cyclebuilder.data.formatNumber
import com.revaks.cyclebuilder.data.formatPercent
import java.io.File
import java.io.FileOutputStream

object PdfExporter {
    private const val PAGE_WIDTH = 595
    private const val PAGE_HEIGHT = 842
    private const val MARGIN = 32f
    private const val BOTTOM = 800f

    fun sharePdf(context: Context, project: Project, cycle: ComputedCycle): File {
        val file = createPdf(context, project, cycle)
        val uri = FileProvider.getUriForFile(
            context,
            "${context.packageName}.fileprovider",
            file,
        )
        val intent = Intent(Intent.ACTION_SEND).apply {
            type = "application/pdf"
            putExtra(Intent.EXTRA_STREAM, uri)
            clipData = ClipData.newRawUri("PDF", uri)
            addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION)
        }
        context.startActivity(Intent.createChooser(intent, "Отправить PDF"))
        return file
    }

    private fun createPdf(context: Context, project: Project, cycle: ComputedCycle): File {
        val dir = File(context.cacheDir, "exports").apply { mkdirs() }
        val file = File(dir, "cycle-builder.pdf")
        val document = PdfDocument()
        val writer = PageWriter(document)

        if (cycle.weeks.isEmpty()) {
            writer.newPage(project.name, "")
            writer.section("В цикле нет недель")
            writer.finishPage()
        }

        cycle.weeks.forEach { week ->
            writer.newPage("${project.name} — ${week.label}", "")
            writer.line(
                "Тоннаж: ${formatNumber(week.tonnage)} кг",
                "КПШ: ${week.kpsh}",
                "Время: ${formatMinutes(week.timeMinutes)}",
            )
            writer.spacer(4f)

            week.days.forEach { day ->
                writer.ensureSpace(30f)
                writer.section("${day.dayName}  ·  ${formatNumber(day.tonnage)} кг  ·  ${day.kpsh} КПШ  ·  ${formatMinutes(day.timeMinutes)}")
                writer.tableHeader()
                if (day.entries.isEmpty()) {
                    writer.row("Отдых", "", "", "", "")
                } else {
                    day.entries.forEach { entry ->
                        if (entry.groups.isEmpty()) {
                            writer.row(entry.exercise.name, "", "", "", "")
                        } else {
                            entry.groups.forEachIndexed { index, group ->
                                writer.row(
                                    if (index == 0) entry.exercise.name else "",
                                    group.group.sets.toString(),
                                    group.group.reps.toString(),
                                    formatPercent(group.group.percent),
                                    formatKg(group.weight),
                                )
                            }
                        }
                    }
                }
                writer.spacer(4f)
            }

            writer.ensureSpace(24f)
            writer.section(
                "Итого за неделю: ${formatNumber(week.tonnage)} кг  ·  ${week.kpsh} КПШ  ·  ${formatMinutes(week.timeMinutes)}",
            )
            writer.finishPage()
        }

        FileOutputStream(file).use { document.writeTo(it) }
        document.close()
        return file
    }

    private class PageWriter(private val document: PdfDocument) {
        private var page: PdfDocument.Page? = null
        private var canvas: Canvas? = null
        private var y = MARGIN
        private var pageNumber = 0
        private var title = ""
        private var continuation = false

        private val normal = Paint(Paint.ANTI_ALIAS_FLAG).apply {
            typeface = Typeface.create("sans-serif", Typeface.NORMAL)
            color = android.graphics.Color.BLACK
            textSize = 10f
        }
        private val bold = Paint(Paint.ANTI_ALIAS_FLAG).apply {
            typeface = Typeface.create("sans-serif", Typeface.BOLD)
            color = android.graphics.Color.BLACK
            textSize = 12f
        }
        private val small = Paint(Paint.ANTI_ALIAS_FLAG).apply {
            typeface = Typeface.create("sans-serif", Typeface.NORMAL)
            color = android.graphics.Color.DKGRAY
            textSize = 9f
        }

        fun newPage(pageTitle: String, subtitle: String) {
            finishPage()
            title = pageTitle
            continuation = false
            pageNumber += 1
            val info = PdfDocument.PageInfo.Builder(PAGE_WIDTH, PAGE_HEIGHT, pageNumber).create()
            val newPage = document.startPage(info)
            page = newPage
            canvas = newPage.canvas
            y = MARGIN
            drawText(pageTitle, MARGIN, y, bold)
            y += 16f
            if (subtitle.isNotEmpty()) {
                drawText(subtitle, MARGIN, y, small)
                y += 14f
            }
        }

        private fun ensurePage() {
            if (y + 16f > BOTTOM) {
                finishPage()
                continuation = true
                pageNumber += 1
                val info = PdfDocument.PageInfo.Builder(PAGE_WIDTH, PAGE_HEIGHT, pageNumber).create()
                val newPage = document.startPage(info)
                page = newPage
                canvas = newPage.canvas
                y = MARGIN
                drawText("$title (продолжение)", MARGIN, y, bold)
                y += 16f
            }
        }

        fun ensureSpace(space: Float) {
            if (y + space > BOTTOM) ensurePage()
        }

        fun finishPage() {
            page?.let { document.finishPage(it) }
            page = null
            canvas = null
        }

        fun spacer(size: Float) {
            y += size
        }

        fun section(text: String) {
            ensureSpace(18f)
            drawText(text, MARGIN, y, bold)
            y += 16f
        }

        fun tableHeader() {
            ensureSpace(14f)
            drawText("Упражнение", MARGIN, y, small)
            drawText("Подх.", 300f, y, small)
            drawText("Повт.", 345f, y, small)
            drawText("%", 395f, y, small)
            drawText("Вес", 455f, y, small)
            y += 14f
        }

        fun row(exercise: String, sets: String, reps: String, percent: String, weight: String) {
            ensureSpace(14f)
            drawText(exercise.take(34), MARGIN, y, normal)
            drawText(sets, 300f, y, normal)
            drawText(reps, 345f, y, normal)
            drawText(percent, 395f, y, normal)
            drawText(weight, 455f, y, normal)
            y += 13f
        }

        fun line(a: String, b: String, c: String) {
            ensureSpace(14f)
            drawText(a, MARGIN, y, normal)
            drawText(b, 220f, y, normal)
            drawText(c, 380f, y, normal)
            y += 14f
        }

        private fun drawText(text: String, x: Float, baseline: Float, paint: Paint) {
            canvas?.drawText(text, x, baseline, paint)
        }
    }
}
