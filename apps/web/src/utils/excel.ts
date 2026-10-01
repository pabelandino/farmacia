import ExcelJS from 'exceljs';
import { todayIso } from './dates';

const HEADER_FILL: ExcelJS.Fill = {
  type: 'pattern',
  pattern: 'solid',
  fgColor: { argb: 'FF5B21B6' },
};

function fileSlug(value: string) {
  return value.replace(/[^\p{L}\p{N}]+/gu, '-').replace(/^-|-$/g, '') || 'farmacia';
}

export async function exportTableExcel(options: {
  pharmacyName: string;
  title: string;
  sheetName: string;
  filenamePrefix: string;
  columns: Array<{ header: string; key: string; width?: number }>;
  rows: Array<Record<string, string | number | null | undefined>>;
  totals?: Record<string, string | number>;
}) {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'Elsa SYS';
  workbook.created = new Date();
  const sheet = workbook.addWorksheet(options.sheetName, {
    views: [{ state: 'frozen', ySplit: 4, showGridLines: false }],
  });

  sheet.mergeCells('A1', `${columnLetter(options.columns.length)}1`);
  sheet.mergeCells('A2', `${columnLetter(options.columns.length)}2`);
  sheet.mergeCells('A3', `${columnLetter(options.columns.length)}3`);

  const title = sheet.getCell('A1');
  title.value = options.pharmacyName;
  title.font = { bold: true, size: 16, color: { argb: 'FF5B21B6' }, name: 'Calibri' };

  const subtitle = sheet.getCell('A2');
  subtitle.value = options.title;
  subtitle.font = { bold: true, size: 12, color: { argb: 'FF1E293B' }, name: 'Calibri' };

  const generated = sheet.getCell('A3');
  generated.value = `Generado: ${todayIso()}`;
  generated.font = { italic: true, size: 10, color: { argb: 'FF64748B' }, name: 'Calibri' };

  sheet.columns = options.columns.map((column) => ({
    key: column.key,
    width: column.width ?? 16,
  }));

  const headerRow = sheet.getRow(4);
  options.columns.forEach((column, index) => {
    const cell = headerRow.getCell(index + 1);
    cell.value = column.header;
    cell.fill = HEADER_FILL;
    cell.font = { bold: true, color: { argb: 'FFFFFFFF' }, name: 'Calibri', size: 11 };
    cell.alignment = { vertical: 'middle', horizontal: 'center' };
    cell.border = {
      top: { style: 'thin', color: { argb: 'FF4C1D95' } },
      bottom: { style: 'thin', color: { argb: 'FF4C1D95' } },
    };
  });
  headerRow.height = 20;

  for (const row of options.rows) {
    const added = sheet.addRow(options.columns.map((column) => row[column.key] ?? ''));
    added.font = { name: 'Calibri', size: 10 };
    added.alignment = { vertical: 'middle' };
    added.eachCell((cell) => {
      if (typeof cell.value === 'number') {
        cell.numFmt = Number.isInteger(cell.value) ? '#,##0' : '#,##0.00';
      }
    });
  }

  if (options.totals) {
    const totalRow = sheet.addRow(options.columns.map((column, index) => {
      if (index === 0) return 'TOTAL';
      return options.totals?.[column.key] ?? '';
    }));
    totalRow.font = { bold: true, name: 'Calibri', size: 11 };
    totalRow.eachCell((cell) => {
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFEDE9FE' } };
      if (typeof cell.value === 'number') {
        cell.numFmt = Number.isInteger(cell.value) ? '#,##0' : '#,##0.00';
      }
    });
  }

  sheet.autoFilter = {
    from: { row: 4, column: 1 },
    to: { row: 4, column: options.columns.length },
  };

  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `${options.filenamePrefix}-${fileSlug(options.pharmacyName)}-${todayIso()}.xlsx`;
  link.click();
  URL.revokeObjectURL(url);
}

function columnLetter(index: number) {
  let value = index;
  let letters = '';
  while (value > 0) {
    const rem = (value - 1) % 26;
    letters = String.fromCharCode(65 + rem) + letters;
    value = Math.floor((value - 1) / 26);
  }
  return letters || 'A';
}
