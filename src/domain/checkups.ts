import { addDays, addMonths } from './dates';
import type { CheckupRecurrence, ISODate } from './types';

/**
 * The next checkup date after a visit on `visitDate`.
 * Interval recurrences count from the actual visit date, so a late visit pushes the next one out.
 * Specific-date lists return the first listed date after the visit.
 * Returns undefined when nothing further is scheduled.
 */
export function nextCheckupDate(rule: CheckupRecurrence, visitDate: ISODate): ISODate | undefined {
  switch (rule.kind) {
    case 'once':
      return undefined;
    case 'months':
      return addMonths(visitDate, rule.every);
    case 'interval':
      if (rule.unit === 'days') return addDays(visitDate, rule.every);
      if (rule.unit === 'weeks') return addDays(visitDate, rule.every * 7);
      return addMonths(visitDate, rule.every);
    case 'dates':
      return [...rule.dates].sort().find((d) => d > visitDate);
  }
}

export const CHECKUP_PRESETS = [1, 3, 6, 12] as const;

/**
 * Upcoming date when a checkup is saved. For a list of dates, it's the first one on or after today
 * that also comes after the last visit, so a date already visited today is not brought back.
 */
export function initialCheckupDate(
  rule: CheckupRecurrence,
  chosenDate: ISODate | null,
  today: ISODate,
  lastVisit?: ISODate | null,
): ISODate | undefined {
  if (rule.kind === 'dates') return [...rule.dates].sort().find((d) => d >= today && (!lastVisit || d > lastVisit));
  return chosenDate ?? undefined;
}

export function describeRecurrence(rule: CheckupRecurrence): string {
  switch (rule.kind) {
    case 'once':
      return 'One time';
    case 'months':
      return rule.every === 1 ? 'Every month' : rule.every === 12 ? 'Every year' : `Every ${rule.every} months`;
    case 'interval':
      return `Every ${rule.every} ${rule.every === 1 ? rule.unit.replace(/s$/, '') : rule.unit}`;
    case 'dates':
      return `${rule.dates.length} set date${rule.dates.length === 1 ? '' : 's'}`;
  }
}

export type CheckupReminder = { id: string; checkupId: string; date: ISODate; minute: number; kind: 'dayBefore' | 'morningOf' };

export const CHECKUP_REMINDER_LIMIT = 6;

/**
 * Reminders for upcoming checkups: the evening before (7 PM) and the morning of (8 AM).
 * Only the soonest few are kept, so dose reminders keep most of the iOS limit of 64.
 */
export function planCheckupNotifications(
  checkups: { id: string; nextDate: ISODate | null }[],
  today: ISODate,
  nowMinute: number,
  limit = CHECKUP_REMINDER_LIMIT,
): CheckupReminder[] {
  const out: CheckupReminder[] = [];
  for (const c of checkups) {
    if (!c.nextDate || c.nextDate < today) continue;
    const candidates: CheckupReminder[] = [
      { id: `checkup:${c.id}:before`, checkupId: c.id, date: addDays(c.nextDate, -1), minute: 19 * 60, kind: 'dayBefore' },
      { id: `checkup:${c.id}:day`, checkupId: c.id, date: c.nextDate, minute: 8 * 60, kind: 'morningOf' },
    ];
    for (const r of candidates) {
      if (r.date < today || (r.date === today && r.minute <= nowMinute)) continue;
      out.push(r);
    }
  }
  out.sort((a, b) => (a.date === b.date ? a.minute - b.minute : a.date < b.date ? -1 : 1));
  return out.slice(0, limit);
}

/** Editable form state for recurrence. */
export type RecurrenceDraft = {
  kind: 'preset' | 'interval' | 'dates' | 'once';
  preset: number;
  every: string;
  unit: 'days' | 'weeks' | 'months';
  dates: string;
};

export function recurrenceToDraft(r: CheckupRecurrence): RecurrenceDraft {
  const base: RecurrenceDraft = { kind: 'preset', preset: 3, every: '2', unit: 'weeks', dates: '' };
  switch (r.kind) {
    case 'months':
      return (CHECKUP_PRESETS as readonly number[]).includes(r.every)
        ? { ...base, preset: r.every }
        : { ...base, kind: 'interval', every: String(r.every), unit: 'months' };
    case 'interval':
      return { ...base, kind: 'interval', every: String(r.every), unit: r.unit };
    case 'dates':
      return { ...base, kind: 'dates', dates: r.dates.join(', ') };
    case 'once':
      return { ...base, kind: 'once' };
  }
}

export function draftToRecurrence(d: RecurrenceDraft): { value?: CheckupRecurrence; error?: string } {
  if (d.kind === 'preset') return { value: { kind: 'months', every: d.preset } };
  if (d.kind === 'once') return { value: { kind: 'once' } };
  if (d.kind === 'interval') {
    const n = Number(d.every);
    if (!Number.isInteger(n) || n <= 0) return { error: 'Enter a whole number.' };
    return { value: { kind: 'interval', every: n, unit: d.unit } };
  }
  const dates = d.dates
    .split(/[\s,]+/)
    .map((x) => x.trim())
    .filter(Boolean);
  if (!dates.length || dates.some((x) => !/^\d{4}-\d{2}-\d{2}$/.test(x))) return { error: 'List dates as YYYY-MM-DD, separated by commas.' };
  return { value: { kind: 'dates', dates: [...new Set(dates)].sort() } };
}
