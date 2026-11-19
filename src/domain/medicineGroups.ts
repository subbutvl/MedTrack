import { slotMinute } from './schedule';
import { sectionFor } from './timeline';
import type { MealTimes, MedicationSchedule, MinuteOfDay } from './types';

export type TimeGroup = 'morning' | 'afternoon' | 'evening' | 'night' | 'asNeeded';
export const TIME_GROUPS: TimeGroup[] = ['morning', 'afternoon', 'evening', 'night', 'asNeeded'];

type Groupable = { name: string; schedule: MedicationSchedule };

/**
 * Groups medicines by when they are taken, the same way Today groups doses: Morning, Afternoon,
 * Evening, Night, then As needed. A medicine taken at several times appears in each of those groups.
 * Within a group, medicines are ordered by time, then by name. Empty groups are left out.
 */
export function groupByTimeOfDay<T extends Groupable>(
  meds: T[],
  mealsFor: (med: T) => MealTimes,
): { group: TimeGroup; items: { med: T; minute: MinuteOfDay | null }[] }[] {
  const buckets = new Map<TimeGroup, { med: T; minute: MinuteOfDay | null }[]>();
  const put = (g: TimeGroup, med: T, minute: MinuteOfDay | null) => buckets.set(g, [...(buckets.get(g) ?? []), { med, minute }]);

  for (const med of meds) {
    if (med.schedule.frequency.kind === 'asNeeded' || med.schedule.slots.length === 0) {
      put('asNeeded', med, null);
      continue;
    }
    // Earliest time in each part of the day, so a medicine shows once per group.
    const earliest = new Map<TimeGroup, MinuteOfDay>();
    for (const slot of med.schedule.slots) {
      const m = slotMinute(slot, mealsFor(med));
      const g = sectionFor(m);
      if (!earliest.has(g) || m < earliest.get(g)!) earliest.set(g, m);
    }
    earliest.forEach((m, g) => put(g, med, m));
  }

  return TIME_GROUPS.filter((g) => buckets.has(g)).map((group) => ({
    group,
    items: buckets
      .get(group)!
      .sort((a, b) => (a.minute ?? 0) - (b.minute ?? 0) || a.med.name.localeCompare(b.med.name)),
  }));
}
