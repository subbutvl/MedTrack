import { slotMinute } from './schedule';
import { formatMinute } from './timeline';
import type { DoseSlot, MealTimes, MedicationSchedule } from './types';

const MEAL = { breakfast: 'breakfast', lunch: 'lunch', dinner: 'dinner', bedtime: 'bedtime' } as const;
const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export function describeSlot(slot: DoseSlot, meals: MealTimes): string {
  const time = formatMinute(slotMinute(slot, meals));
  if (slot.kind === 'clock') return time;
  if (slot.meal === 'bedtime') return `At bedtime (${time})`;
  const rel = slot.relation === 'with' ? 'With' : slot.relation === 'before' ? 'Before' : 'After';
  return `${rel} ${MEAL[slot.meal]} (${time})`;
}

/** A short plain-English summary such as "Every day · Before breakfast (7:30 AM), After dinner (8:30 PM)". */
export function describeSchedule(s: MedicationSchedule, meals: MealTimes): string {
  const freq =
    s.frequency.kind === 'daily'
      ? 'Every day'
      : s.frequency.kind === 'weekdays'
        ? [...s.frequency.days].sort().map((d) => DAYS[d]).join(', ')
        : s.frequency.kind === 'everyNDays'
          ? `Every ${s.frequency.n} days`
          : 'When needed';
  const parts = [freq];
  if (s.frequency.kind !== 'asNeeded' && s.slots.length) parts.push(s.slots.map((x) => describeSlot(x, meals)).join(', '));
  if (s.taper?.length) parts.push(`Tapering over ${s.taper.reduce((a, p) => a + p.days, 0)} days`);
  else if (s.endDate) parts.push(`Until ${s.endDate}`);
  return parts.join(' · ');
}
