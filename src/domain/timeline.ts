import { dosesForDay } from './schedule';
import type { ISODate, MealTimes, MedicationSchedule, MinuteOfDay } from './types';

export type DoseStatus = 'pending' | 'due' | 'overdue' | 'snoozed' | 'taken' | 'skipped' | 'missed';

export type TimelineMedication = {
  id: string;
  personId: string;
  name: string;
  strength?: string | null;
  schedule: MedicationSchedule;
  meals: MealTimes;
};

export type LoggedEvent = {
  medicationId: string;
  plannedDate: ISODate;
  slotIndex: number;
  status: 'taken' | 'skipped' | 'snoozed' | 'missed';
  snoozedUntilMinute?: MinuteOfDay | null;
};

export type TimelineItem = {
  key: string;
  medicationId: string;
  personId: string;
  name: string;
  strength?: string | null;
  date: ISODate;
  minute: MinuteOfDay;
  amount: number;
  slotIndex: number;
  status: DoseStatus;
};

export const DUE_WINDOW_MINUTES = 30;
export const MISSED_AFTER_MINUTES = 180;

/**
 * Builds one day's dose timeline across every medication and person, merging in the dose log.
 * The status of a dose that hasn't been logged depends on the time: pending, then due
 * (inside the window), then overdue, then missed.
 */
export function buildTimeline(
  meds: TimelineMedication[],
  events: LoggedEvent[],
  date: ISODate,
  nowMinute: MinuteOfDay,
  isToday = true,
): TimelineItem[] {
  const byKey = new Map(events.filter((e) => e.plannedDate === date).map((e) => [`${e.medicationId}:${e.slotIndex}`, e]));
  const items: TimelineItem[] = [];

  for (const med of meds) {
    for (const d of dosesForDay(med.schedule, date, med.meals)) {
      const logged = byKey.get(`${med.id}:${d.slotIndex}`);
      items.push({
        key: `${med.id}:${date}:${d.slotIndex}`,
        medicationId: med.id,
        personId: med.personId,
        name: med.name,
        strength: med.strength,
        date,
        minute: d.minute,
        amount: d.amount,
        slotIndex: d.slotIndex,
        status: statusFor(d.minute, logged, nowMinute, isToday),
      });
    }
  }
  return items.sort((a, b) => a.minute - b.minute || a.name.localeCompare(b.name));
}

function statusFor(minute: MinuteOfDay, logged: LoggedEvent | undefined, now: MinuteOfDay, isToday: boolean): DoseStatus {
  if (logged && logged.status !== 'snoozed') return logged.status;
  if (!isToday) return 'pending';
  if (logged?.status === 'snoozed' && logged.snoozedUntilMinute != null && now < logged.snoozedUntilMinute) return 'snoozed';
  const late = now - minute;
  if (late < -DUE_WINDOW_MINUTES) return 'pending';
  if (late <= DUE_WINDOW_MINUTES) return 'due';
  if (late <= MISSED_AFTER_MINUTES) return 'overdue';
  return 'missed';
}

/** Groups timeline items into labelled sections such as "Morning", for the Today view. */
export function sectionFor(minute: MinuteOfDay): 'morning' | 'afternoon' | 'evening' | 'night' {
  if (minute < 12 * 60) return 'morning';
  if (minute < 17 * 60) return 'afternoon';
  if (minute < 21 * 60) return 'evening';
  return 'night';
}

export function formatMinute(m: MinuteOfDay): string {
  const h = Math.floor(m / 60);
  const mm = String(m % 60).padStart(2, '0');
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return `${h12}:${mm} ${h < 12 ? 'AM' : 'PM'}`;
}

/** Parses 'HH:MM' (24-hour) into minutes, or returns null if invalid. */
export function parseClock(text: string): MinuteOfDay | null {
  const m = /^(\d{1,2}):(\d{2})$/.exec(text.trim());
  if (!m) return null;
  const h = Number(m[1]);
  const min = Number(m[2]);
  if (h > 23 || min > 59) return null;
  return h * 60 + min;
}

export function toClock(m: MinuteOfDay): string {
  return `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`;
}
