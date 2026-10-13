import { EXPIRY_ALERT_MONTHS, addCalendarMonths, calendarDateIso, calendarDateUtc } from '@farmaplus/domain';

/** Pharmacy calendar day (America/Managua), not the UTC day. */
export function todayIso(at = new Date()) {
  return calendarDateIso(at);
}

export function monthsAgoIso(months = EXPIRY_ALERT_MONTHS) {
  return addCalendarMonths(todayIso(), -months);
}

export function isoDate(offsetDays = 0) {
  const utc = calendarDateUtc();
  utc.setUTCDate(utc.getUTCDate() + offsetDays);
  return utc.toISOString().slice(0, 10);
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

function isValidCalendarDay(year: number, month: number, day: number) {
  const utc = new Date(Date.UTC(year, month - 1, day));
  return utc.getUTCFullYear() === year && utc.getUTCMonth() === month - 1 && utc.getUTCDate() === day;
}

/** Parse a typed day/month/year value into ISO yyyy-mm-dd. Requires a 4-digit year. */
export function parseDmyToIso(value: string) {
  const trimmed = value.trim();
  if (!trimmed) return '';
  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
    const [year, month, day] = trimmed.split('-').map(Number);
    return year && month && day && isValidCalendarDay(year, month, day) ? trimmed : '';
  }
  const parts = trimmed.split(/[/\-.]/);
  if (parts.length !== 3) return '';
  const [dayPart, monthPart, yearPart] = parts;
  if (!dayPart || !monthPart || yearPart?.length !== 4) return '';
  const year = Number(yearPart);
  const month = Number(monthPart);
  const day = Number(dayPart);
  if (!year || !month || !day || month < 1 || month > 12 || day < 1 || day > 31) return '';
  if (!isValidCalendarDay(year, month, day)) return '';
  return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}
