import { addDays, daysBetween, weekday } from './dates';
import type { DoseSlot, ISODate, MealTimes, MedicationSchedule, MinuteOfDay, PlannedDose } from './types';

/** Resolves a slot to a minute of the day, using the person's meal times. */
export function slotMinute(slot: DoseSlot, meals: MealTimes): MinuteOfDay {
  if (slot.kind === 'clock') return slot.time;
  const base = meals[slot.meal];
  const offset = slot.relation === 'before' ? -slot.offsetMinutes : slot.relation === 'after' ? slot.offsetMinutes : 0;
  return (((base + offset) % 1440) + 1440) % 1440;
}

/** Returns true when the course is active on `date` and the frequency includes that day. */
export function isDoseDay(s: MedicationSchedule, date: ISODate): boolean {
  if (date < s.startDate) return false;
  if (s.endDate && date > s.endDate) return false;
  const taperEnd = taperEndDayIndex(s);
  if (taperEnd !== undefined && daysBetween(s.startDate, date) >= taperEnd) return false;

  switch (s.frequency.kind) {
    case 'daily':
      return true;
    case 'weekdays':
      return s.frequency.days.includes(weekday(date));
    case 'everyNDays':
      return daysBetween(s.startDate, date) % Math.max(1, s.frequency.n) === 0;
    case 'asNeeded':
      return false;
  }
}

function taperEndDayIndex(s: MedicationSchedule): number | undefined {
  if (!s.taper?.length) return undefined;
  return s.taper.reduce((sum, p) => sum + p.days, 0);
}

/** The dose amount for a given day. When tapering, the current phase overrides the slot amount. */
export function amountOn(s: MedicationSchedule, slot: DoseSlot, date: ISODate): number {
  if (!s.taper?.length) return slot.amount;
  let dayIndex = daysBetween(s.startDate, date);
  for (const phase of s.taper) {
    if (dayIndex < phase.days) return phase.amount;
    dayIndex -= phase.days;
  }
  return 0;
}

/** Expands a schedule into concrete doses for one day, sorted by time. */
export function dosesForDay(s: MedicationSchedule, date: ISODate, meals: MealTimes): PlannedDose[] {
  if (!isDoseDay(s, date)) return [];
  return s.slots
    .map((slot, slotIndex) => ({ date, minute: slotMinute(slot, meals), amount: amountOn(s, slot, date), slotIndex }))
    .filter((d) => d.amount > 0)
    .sort((a, b) => a.minute - b.minute);
}

/** Average daily use over the next `days` days, used for stock forecasting. */
export function dailyUse(s: MedicationSchedule, from: ISODate, meals: MealTimes, days = 14): number {
  let total = 0;
  for (let i = 0; i < days; i++) {
    total += dosesForDay(s, addDays(from, i), meals).reduce((sum, x) => sum + x.amount, 0);
  }
  return total / days;
}
