import { calendarDateUtc } from '@farmaplus/domain';

/** Persist a calendar day as UTC midnight. Defaults to today in America/Managua. */
export function dateOnly(value?: string) {
  return value ? calendarDateUtc(value) : calendarDateUtc();
}
