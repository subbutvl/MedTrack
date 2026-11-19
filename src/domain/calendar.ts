import { nextCheckupDate } from './checkups';
import { addDays, parseDate, weekday } from './dates';
import { buildTimeline, type DoseStatus, type LoggedEvent, type TimelineItem, type TimelineMedication } from './timeline';
import type { CheckupRecurrence, ISODate, MinuteOfDay } from './types';

/** Weeks start on Sunday, as on most phone calendars in India. */
export const WEEK_STARTS_ON = 0;

export function startOfWeek(d: ISODate): ISODate {
  return addDays(d, -((weekday(d) - WEEK_STARTS_ON + 7) % 7));
}

/** The seven dates of the week that contains `d`. */
export function weekOf(d: ISODate): ISODate[] {
  const start = startOfWeek(d);
  return Array.from({ length: 7 }, (_, i) => addDays(start, i));
}

/** The first day of the month that contains `d`. */
export function startOfMonth(d: ISODate): ISODate {
  return `${d.slice(0, 7)}-01`;
}

/** The first day of the month `n` months away from the month that contains `d`. */
export function shiftMonth(d: ISODate, n: number): ISODate {
  const x = parseDate(startOfMonth(d));
  x.setUTCMonth(x.getUTCMonth() + n);
  return x.toISOString().slice(0, 10);
}

/**
 * The month that contains `d` as whole weeks. Days from the months before and after are null,
 * so the grid lines up under the weekday headings.
 */
export function monthGrid(d: ISODate): (ISODate | null)[][] {
  const first = startOfMonth(d);
  const last = addDays(shiftMonth(d, 1), -1);
  const month = first.slice(0, 7);
  const weeks: (ISODate | null)[][] = [];
  for (let start = startOfWeek(first); start <= last; start = addDays(start, 7)) {
    weeks.push(weekOf(start).map((x) => (x.slice(0, 7) === month ? x : null)));
  }
  return weeks;
}

/** The first and last dates shown by a month grid, including the days that pad its weeks. */
export function monthGridRange(d: ISODate): { from: ISODate; to: ISODate } {
  const weeks = monthGrid(d);
  const from = startOfWeek(startOfMonth(d));
  return { from, to: addDays(from, weeks.length * 7 - 1) };
}

/**
 * One day's doses with their status. A dose on a past day that was never logged counts as missed,
 * and a dose on a later day is upcoming.
 */
export function dosesOn(
  meds: TimelineMedication[],
  events: LoggedEvent[],
  date: ISODate,
  today: ISODate,
  nowMinute: MinuteOfDay,
): TimelineItem[] {
  const items = buildTimeline(meds, events, date, nowMinute, date === today);
  if (date >= today) return items;
  return items.map((i) => (i.status === 'pending' ? { ...i, status: 'missed' as DoseStatus } : i));
}

export type DayProgress = { planned: number; taken: number; skipped: number; missed: number };

/** Counts for a day's ring: how many doses were planned, taken, skipped and missed. */
export function dayProgress(items: TimelineItem[]): DayProgress {
  const p: DayProgress = { planned: items.length, taken: 0, skipped: 0, missed: 0 };
  for (const i of items) {
    if (i.status === 'taken') p.taken++;
    else if (i.status === 'skipped') p.skipped++;
    else if (i.status === 'missed') p.missed++;
  }
  return p;
}

export type CheckupDayKind = 'visited' | 'scheduled' | 'overdue' | 'expected';

export type CheckupDay = { checkupId: string; title: string; kind: CheckupDayKind };

type CalendarCheckup = { id: string; title: string; recurrence: CheckupRecurrence; nextDate: ISODate | null };

/** Stop projecting repeats after this many, so a daily interval can't run away. */
const MAX_PROJECTED = 60;

/**
 * Everything that falls on each day between `from` and `to`: past visits, the next scheduled date
 * (overdue when it has passed), and the later repeats it leads to if each visit happens on time.
 */
export function checkupDays(
  checkups: CalendarCheckup[],
  visits: { checkupId: string; visitDate: ISODate }[],
  from: ISODate,
  to: ISODate,
  today: ISODate,
): Map<ISODate, CheckupDay[]> {
  const days = new Map<ISODate, CheckupDay[]>();
  const add = (date: ISODate, day: CheckupDay) => {
    if (date < from || date > to) return;
    const list = days.get(date) ?? [];
    if (!list.some((x) => x.checkupId === day.checkupId && x.kind === day.kind)) list.push(day);
    days.set(date, list);
  };
  const byId = new Map(checkups.map((c) => [c.id, c]));

  for (const v of visits) {
    const c = byId.get(v.checkupId);
    if (c) add(v.visitDate, { checkupId: c.id, title: c.title, kind: 'visited' });
  }

  for (const c of checkups) {
    if (!c.nextDate) continue;
    add(c.nextDate, { checkupId: c.id, title: c.title, kind: c.nextDate < today ? 'overdue' : 'scheduled' });
    // Repeats count from the next date, or from today when it is overdue, as a visit today would.
    let d = nextCheckupDate(c.recurrence, c.nextDate < today ? today : c.nextDate);
    for (let n = 0; d && d <= to && n < MAX_PROJECTED; n++) {
      add(d, { checkupId: c.id, title: c.title, kind: 'expected' });
      d = nextCheckupDate(c.recurrence, d);
    }
  }
  return days;
}
