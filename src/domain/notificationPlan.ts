import { addDays } from './dates';
import { dosesForDay } from './schedule';
import type { ISODate, MealTimes, MedicationSchedule, MinuteOfDay } from './types';

export type PlanInput = {
  medicationId: string;
  personId: string;
  schedule: MedicationSchedule;
  meals: MealTimes;
};

export type PlannedNotification = {
  id: string; // stable per medication, date, and slot, so re-planning is idempotent
  medicationId: string;
  personId: string;
  date: ISODate;
  minute: MinuteOfDay;
};

/** iOS allows 64 pending local notifications per app. Leave headroom for checkup and refill alerts. */
export const IOS_DOSE_NOTIFICATION_LIMIT = 56;

/**
 * Rolling-window planner. It expands every medication over the next `days` days, drops
 * anything already past, and keeps the soonest `limit` entries. The scheduler service
 * re-runs this on app open, after any edit, after each dose action, and from background fetch.
 */
export function planDoseNotifications(
  inputs: PlanInput[],
  today: ISODate,
  nowMinute: MinuteOfDay,
  { days = 2, limit = IOS_DOSE_NOTIFICATION_LIMIT }: { days?: number; limit?: number } = {},
): PlannedNotification[] {
  const out: PlannedNotification[] = [];
  for (let i = 0; i < days; i++) {
    const date = addDays(today, i);
    for (const input of inputs) {
      for (const d of dosesForDay(input.schedule, date, input.meals)) {
        if (i === 0 && d.minute <= nowMinute) continue;
        out.push({
          id: `dose:${input.medicationId}:${date}:${d.slotIndex}`,
          medicationId: input.medicationId,
          personId: input.personId,
          date,
          minute: d.minute,
        });
      }
    }
  }
  out.sort((a, b) => (a.date === b.date ? a.minute - b.minute : a.date < b.date ? -1 : 1));
  return out.slice(0, limit);
}
