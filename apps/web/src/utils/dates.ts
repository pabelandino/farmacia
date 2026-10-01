import { EXPIRY_ALERT_MONTHS, addCalendarMonths } from '@farmaplus/domain';

/** Local calendar day as YYYY-MM-DD (not UTC, so evening in UTC-6 stays today). */
export function todayIso(at = new Date()) {
  const year = at.getFullYear();
  const month = String(at.getMonth() + 1).padStart(2, '0');
  const day = String(at.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function monthsAgoIso(months = EXPIRY_ALERT_MONTHS) {
  return addCalendarMonths(todayIso(), -months);
}

export function isoDate(offsetDays = 0) {
  const date = new Date();
  date.setDate(date.getDate() + offsetDays);
  return todayIso(date);
}

export function dateOnly(value: string) {
  return String(value).slice(0, 10);
}

/** Local calendar stamp for backup files: respaldo_dd-mm-yyyy.sql.gz */
export function backupFileName(at = new Date()) {
  const day = String(at.getDate()).padStart(2, '0');
  const month = String(at.getMonth() + 1).padStart(2, '0');
  return `respaldo_${day}-${month}-${at.getFullYear()}.sql.gz`;
}

const MONTHS_SHORT = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'] as const;

/** Chart axis label: 05 - Nov */
export function formatChartDay(value: string) {
  const raw = String(value).trim();
  const parts = raw.split('-');
  const month = Number(parts.length === 3 ? parts[1] : parts[0]);
  const day = Number(parts.length === 3 ? parts[2] : parts[1]);
  if (!month || !day || month < 1 || month > 12) return raw;
  return `${String(day).padStart(2, '0')} - ${MONTHS_SHORT[month - 1]}`;
}

export function formatReportDate(value: string | Date | null | undefined) {
  if (!value) return '';
  const iso = dateOnly(String(value));
  const [year, month, day] = iso.split('-');
  if (!year || !month || !day) return iso;
  return `${day}/${month}/${year}`;
}

/** Parse a typed day/month/year value into ISO yyyy-mm-dd. */
export function parseDmyToIso(value: string) {
  const trimmed = value.trim();
  if (!trimmed) return '';
  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) return trimmed;
  const parts = trimmed.split(/[/\-.]/);
  if (parts.length !== 3) return '';
  const [dayPart, monthPart, yearPart] = parts;
  if (!dayPart || !monthPart || !yearPart) return '';
  const year = yearPart.length === 2 ? `20${yearPart}` : yearPart;
  if (year.length !== 4) return '';
  const day = Number(dayPart);
  const month = Number(monthPart);
  if (!day || !month || month < 1 || month > 12 || day < 1 || day > 31) return '';
  const iso = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
  const parsed = new Date(`${iso}T00:00:00`);
  if (Number.isNaN(parsed.getTime()) || parsed.getDate() !== day || parsed.getMonth() + 1 !== month) return '';
  return iso;
}
