import { addDays, daysBetween } from './dates';
import { parseClock, toClock } from './timeline';
import type { DoseSlot, Frequency, Meal, MedicationSchedule } from './types';

/** Editable, string-based form state for a medicine schedule. It is kept separate from the stored shape. */
export type SlotDraft =
  | { kind: 'meal'; meal: Meal; relation: 'before' | 'with' | 'after'; offset: string; amount: string }
  | { kind: 'clock'; time: string; amount: string };

export type ScheduleDraft = {
  slots: SlotDraft[];
  frequency: Frequency['kind'];
  weekdays: number[];
  everyN: string;
  startDate: string;
  durationDays: string;
  taperOn: boolean;
  taper: { amount: string; days: string }[];
};

export const newSlot = (): SlotDraft => ({ kind: 'meal', meal: 'breakfast', relation: 'after', offset: '0', amount: '1' });

export function emptyDraft(today: string): ScheduleDraft {
  return {
    slots: [newSlot()],
    frequency: 'daily',
    weekdays: [1, 2, 3, 4, 5],
    everyN: '2',
    startDate: today,
    durationDays: '',
    taperOn: false,
    taper: [
      { amount: '2', days: '5' },
      { amount: '1', days: '5' },
    ],
  };
}

export function draftFromSchedule(s: MedicationSchedule): ScheduleDraft {
  const base = emptyDraft(s.startDate);
  return {
    ...base,
    slots: s.slots.map((x) =>
      x.kind === 'meal'
        ? { kind: 'meal', meal: x.meal, relation: x.relation, offset: String(x.offsetMinutes), amount: String(x.amount) }
        : { kind: 'clock', time: toClock(x.time), amount: String(x.amount) },
    ),
    frequency: s.frequency.kind,
    weekdays: s.frequency.kind === 'weekdays' ? s.frequency.days : base.weekdays,
    everyN: s.frequency.kind === 'everyNDays' ? String(s.frequency.n) : base.everyN,
    durationDays: s.endDate && !s.taper?.length ? String(daysBetween(s.startDate, s.endDate) + 1) : '',
    taperOn: !!s.taper?.length,
    taper: s.taper?.length ? s.taper.map((p) => ({ amount: String(p.amount), days: String(p.days) })) : base.taper,
  };
}

export type DraftErrors = Partial<Record<'slots' | 'everyN' | 'startDate' | 'duration' | 'taper' | 'weekdays', string>>;

const positive = (t: string) => {
  const n = Number(t);
  return Number.isFinite(n) && n > 0 ? n : null;
};

/** Validates the draft and converts it into a stored schedule. */
export function scheduleFromDraft(d: ScheduleDraft): { schedule?: MedicationSchedule; errors: DraftErrors } {
  const errors: DraftErrors = {};
  if (!/^\d{4}-\d{2}-\d{2}$/.test(d.startDate)) errors.startDate = 'Use YYYY-MM-DD.';

  const slots: DoseSlot[] = [];
  if (d.frequency !== 'asNeeded') {
    if (!d.slots.length) errors.slots = 'Add at least one time.';
    for (const s of d.slots) {
      const amount = positive(s.amount);
      if (amount == null) {
        errors.slots = 'Each dose needs an amount greater than 0.';
        continue;
      }
      if (s.kind === 'clock') {
        const time = parseClock(s.time);
        if (time == null) {
          errors.slots = 'Use HH:MM for set times, for example 21:30.';
          continue;
        }
        slots.push({ kind: 'clock', time, amount });
      } else {
        const offset = s.relation === 'with' ? 0 : Number(s.offset || '0');
        if (!Number.isFinite(offset) || offset < 0 || offset > 180) {
          errors.slots = 'Minutes before or after must be between 0 and 180.';
          continue;
        }
        slots.push({ kind: 'meal', meal: s.meal, relation: s.relation, offsetMinutes: offset, amount });
      }
    }
  }

  let frequency: Frequency;
  if (d.frequency === 'weekdays') {
    if (!d.weekdays.length) errors.weekdays = 'Pick at least one day.';
    frequency = { kind: 'weekdays', days: [...d.weekdays].sort() };
  } else if (d.frequency === 'everyNDays') {
    const n = positive(d.everyN);
    if (n == null || !Number.isInteger(n)) errors.everyN = 'Enter a whole number of days.';
    frequency = { kind: 'everyNDays', n: n ?? 2 };
  } else {
    frequency = { kind: d.frequency };
  }

  const schedule: MedicationSchedule = { slots, frequency, startDate: d.startDate };

  if (d.taperOn && d.frequency !== 'asNeeded') {
    const taper = d.taper.map((p) => ({ amount: positive(p.amount), days: positive(p.days) }));
    if (!taper.length || taper.some((p) => p.amount == null || p.days == null || !Number.isInteger(p.days))) {
      errors.taper = 'Each step needs an amount and a whole number of days.';
    } else {
      schedule.taper = taper.map((p) => ({ amount: p.amount!, days: p.days! }));
      schedule.endDate = addDays(d.startDate, schedule.taper.reduce((a, p) => a + p.days, 0) - 1);
    }
  } else if (d.durationDays.trim()) {
    const n = positive(d.durationDays);
    if (n == null || !Number.isInteger(n)) errors.duration = 'Enter a whole number of days.';
    else if (!errors.startDate) schedule.endDate = addDays(d.startDate, n - 1);
  }

  return Object.keys(errors).length ? { errors } : { schedule, errors };
}
