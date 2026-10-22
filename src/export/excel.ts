import ExcelJS from 'exceljs';
import type { ComputedCycle, ComputedWeek, Project } from '../domain/types';

export type ExportScope =
  | { type: 'cycle' }
  | { type: 'week'; weekId: string }
  | { type: 'day'; weekId: string; dayTemplateId: string };

const HEADERS = [
  'День',
  'Упражнение',
  'Подходы',
  'Повторы',
  '%',
  'Вес',
  'Тоннаж',
  'КПШ',
  'Время',
];

const THIN_BORDER: Partial<ExcelJS.Borders> = {
  top: { style: 'thin', color: { argb: 'FFD8DCD5' } },
  left: { style: 'thin', color: { argb: 'FFD8DCD5' } },
  bottom: { style: 'thin', color: { argb: 'FFD8DCD5' } },
  right: { style: 'thin', color: { argb: 'FFD8DCD5' } },
};

function styleHeader(row: ExcelJS.Row): void {
  row.font = { bold: true, color: { argb: 'FF38443B' } };
  row.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE7EEE7' } };
  row.alignment = { vertical: 'middle' };
  row.eachCell((cell) => {
    cell.border = THIN_BORDER;
  });
}

function styleTotal(row: ExcelJS.Row): void {
  row.font = { bold: true, color: { argb: 'FF38443B' } };
  row.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF2F4EF' } };
  row.eachCell((cell) => {
    cell.border = THIN_BORDER;
  });
}

function styleDataRow(row: ExcelJS.Row): void {
  row.eachCell((cell) => {
    cell.border = THIN_BORDER;
    cell.alignment = { vertical: 'middle' };
  });
}

function selectWeeks(
  cycle: ComputedCycle,
  scope: ExportScope,
): Array<{ week: ComputedWeek; dayTemplateId?: string }> {
  if (scope.type === 'cycle') return cycle.weeks.map((week) => ({ week }));
  if (scope.type === 'week') {
    return cycle.weeks
      .filter((week) => week.weekId === scope.weekId)
      .map((week) => ({ week }));
  }
  return cycle.weeks
    .filter((week) => week.weekId === scope.weekId)
    .map((week) => ({ week, dayTemplateId: scope.dayTemplateId }));
}

function addSummarySheet(
  workbook: ExcelJS.Workbook,
  weeks: ComputedWeek[],
): void {
  const sheet = workbook.addWorksheet('Сводка');
  sheet.columns = [
    { header: 'Неделя', key: 'week', width: 16 },
    { header: 'Тоннаж', key: 'tonnage', width: 14 },
    { header: 'КПШ', key: 'kpsh', width: 10 },
    { header: 'Время (мин)', key: 'time', width: 14 },
    { header: 'Средний вес', key: 'avg', width: 14 },
    { header: 'Фунтиков', key: 'funtikov', width: 14 },
  ];
  styleHeader(sheet.getRow(1));

  for (const week of weeks) {
    const row = sheet.addRow([
      week.label,
      Math.round(week.tonnage),
      week.kpsh,
      week.timeMinutes,
      Number(week.avgWeight.toFixed(2)),
      Number(week.funtikov.toFixed(2)),
    ]);
    row.getCell(2).numFmt = '0';
    row.getCell(4).numFmt = '0';
    row.getCell(5).numFmt = '0.00';
    row.getCell(6).numFmt = '0.00';
    styleDataRow(row);
  }

  const total = sheet.addRow([
    'Итого',
    Math.round(weeks.reduce((sum, week) => sum + week.tonnage, 0)),
    weeks.reduce((sum, week) => sum + week.kpsh, 0),
    weeks.reduce((sum, week) => sum + week.timeMinutes, 0),
    Number(
      (weeks.reduce((sum, week) => sum + week.tonnage, 0) /
        Math.max(1, weeks.reduce((sum, week) => sum + week.kpsh, 0))).toFixed(2),
    ),
    Number(weeks.reduce((sum, week) => sum + week.funtikov, 0).toFixed(2)),
  ]);
  total.getCell(2).numFmt = '0';
  total.getCell(4).numFmt = '0';
  total.getCell(5).numFmt = '0.00';
  total.getCell(6).numFmt = '0.00';
  styleTotal(total);

  sheet.views = [{ state: 'frozen', ySplit: 1 }];
}

function addWeekSheet(
  workbook: ExcelJS.Workbook,
  project: Project,
  week: ComputedWeek,
  dayTemplateId?: string,
): void {
  const sheet = workbook.addWorksheet(`Неделя ${week.label.replace('Неделя ', '')}`);
  sheet.columns = [
    { width: 14 },
    { width: 30 },
    { width: 10 },
    { width: 10 },
    { width: 8 },
    { width: 11 },
    { width: 13 },
    { width: 9 },
    { width: 11 },
  ];

  sheet.mergeCells(1, 1, 1, HEADERS.length);
  const title = sheet.getCell('A1');
  title.value = `${project.name} — ${week.label}`;
  title.font = { bold: true, size: 14, color: { argb: 'FF17201B' } };
  title.alignment = { vertical: 'middle' };

  const header = sheet.addRow(HEADERS);
  styleHeader(header);

  const days = dayTemplateId
    ? week.days.filter((day) => day.dayTemplateId === dayTemplateId)
    : week.days;

  for (const day of days) {
    const dayStartRow = sheet.rowCount + 1;

    if (day.entries.length === 0) {
      const row = sheet.addRow([day.dayName, 'Отдых', '', '', '', '', 0, 0, 0]);
      styleDataRow(row);
    } else {
      for (const entry of day.entries) {
        const entryStartRow = sheet.rowCount + 1;
        if (entry.groups.length === 0) {
          sheet.addRow([day.dayName, entry.exercise.name, '', '', '', null, 0, 0, 0]);
        } else {
          for (const group of entry.groups) {
            const row = sheet.addRow([
              day.dayName,
              entry.exercise.name,
              group.sets,
              group.reps,
              group.percent,
              group.weight,
              group.tonnage === null ? null : Math.round(group.tonnage),
              group.kpsh,
              Number(group.timeMinutes.toFixed(1)),
            ]);
            row.getCell(5).numFmt = '0"%"';
            row.getCell(6).numFmt = '0.0';
            row.getCell(7).numFmt = '0';
            row.getCell(9).numFmt = '0.0';
            styleDataRow(row);
          }
        }
        const entryEndRow = sheet.rowCount;
        if (entryEndRow > entryStartRow) {
          sheet.mergeCells(entryStartRow, 2, entryEndRow, 2);
        }
        sheet.getCell(entryStartRow, 2).font = { bold: true };
      }

      const dayEndRow = sheet.rowCount;
      if (dayEndRow > dayStartRow) {
        sheet.mergeCells(dayStartRow, 1, dayEndRow, 1);
      }
      sheet.getCell(dayStartRow, 1).value = day.dayName;
      sheet.getCell(dayStartRow, 1).font = { bold: true };
    }

    const totalRow = sheet.addRow([
      `Итого: ${day.dayName}`,
      '',
      '',
      '',
      '',
      '',
      Math.round(day.tonnage),
      day.kpsh,
      day.timeMinutes,
    ]);
    totalRow.getCell(7).numFmt = '0';
    totalRow.getCell(9).numFmt = '0';
    styleTotal(totalRow);
  }

  const weekTotal = sheet.addRow([
    'Итого за неделю',
    '',
    '',
    '',
    '',
    '',
    Math.round(week.tonnage),
    week.kpsh,
    week.timeMinutes,
  ]);
  weekTotal.getCell(7).numFmt = '0';
  weekTotal.getCell(9).numFmt = '0';
  styleTotal(weekTotal);

  sheet.views = [{ state: 'frozen', ySplit: 2 }];
}

export async function buildWorkbook(
  project: Project,
  cycle: ComputedCycle,
  scope: ExportScope = { type: 'cycle' },
): Promise<ExcelJS.Workbook> {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'Конструктор цикла';
  workbook.created = new Date();

  const selected = selectWeeks(cycle, scope);
  const weeks = selected.map((item) => item.week);

  addSummarySheet(workbook, weeks);
  for (const item of selected) {
    addWeekSheet(workbook, project, item.week, item.dayTemplateId);
  }

  return workbook;
}

export async function downloadExcel(
  project: Project,
  cycle: ComputedCycle,
  scope: ExportScope = { type: 'cycle' },
): Promise<void> {
  const workbook = await buildWorkbook(project, cycle, scope);
  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer as ArrayBuffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `cycle-builder-${new Date().toISOString().slice(0, 10)}.xlsx`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}
