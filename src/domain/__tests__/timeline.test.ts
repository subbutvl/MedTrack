import { describeSchedule } from '../describe';
import { buildTimeline, formatMinute, parseClock, toClock, type TimelineMedication } from '../timeline';
import { DEFAULT_MEAL_TIMES } from '../types';

const med = (id: string, minutes: number[]): TimelineMedication => ({
  id,
  personId: 'p1',
  name: id,
  meals: DEFAULT_MEAL_TIMES,
  schedule: {
    slots: minutes.map((time) => ({ kind: 'clock' as const, time, amount: 1 })),
    frequency: { kind: 'daily' },
    startDate: '2026-11-01',
  },
});

describe('buildTimeline', () => {
  const meds = [med('B', [8 * 60, 20 * 60]), med('A', [8 * 60])];

  it('orders by time then name and derives time-based status', () => {
    const t = buildTimeline(meds, [], '2026-11-18', 8 * 60 + 10);
    expect(t.map((i) => `${i.name}@${i.minute}:${i.status}`)).toEqual(['A@480:due', 'B@480:due', 'B@1200:pending']);
    expect(buildTimeline(meds, [], '2026-11-18', 9 * 60 + 30)[0].status).toBe('overdue');
    expect(buildTimeline(meds, [], '2026-11-18', 12 * 60)[0].status).toBe('missed');
  });

  it('applies logged events and snoozes', () => {
    const t = buildTimeline(
      meds,
      [
        { medicationId: 'A', plannedDate: '2026-11-18', slotIndex: 0, status: 'taken' },
        { medicationId: 'B', plannedDate: '2026-11-18', slotIndex: 0, status: 'snoozed', snoozedUntilMinute: 9 * 60 },
      ],
      '2026-11-18',
      8 * 60 + 40,
    );
    expect(t[0].status).toBe('taken');
    expect(t[1].status).toBe('snoozed');
    // Once the snooze has ended, the dose goes back to time-based status.
    const later = buildTimeline(meds, [{ medicationId: 'B', plannedDate: '2026-11-18', slotIndex: 0, status: 'snoozed', snoozedUntilMinute: 9 * 60 }], '2026-11-18', 9 * 60 + 5);
    expect(later.find((i) => i.name === 'B' && i.slotIndex === 0)?.status).toBe('overdue');
  });
});

describe('clock helpers', () => {
  it('parses and formats', () => {
    expect(parseClock('07:30')).toBe(450);
    expect(parseClock('7:05')).toBe(425);
    expect(parseClock('24:00')).toBeNull();
    expect(parseClock('abc')).toBeNull();
    expect(toClock(450)).toBe('07:30');
    expect(formatMinute(0)).toBe('12:00 AM');
    expect(formatMinute(13 * 60 + 5)).toBe('1:05 PM');
  });
});

describe('describeSchedule', () => {
  it('summarises frequency, slots and course', () => {
    expect(
      describeSchedule(
        {
          slots: [
            { kind: 'meal', meal: 'breakfast', relation: 'before', offsetMinutes: 30, amount: 1 },
            { kind: 'meal', meal: 'bedtime', relation: 'with', offsetMinutes: 0, amount: 1 },
          ],
          frequency: { kind: 'daily' },
          startDate: '2026-11-18',
          endDate: '2026-11-27',
        },
        DEFAULT_MEAL_TIMES,
      ),
    ).toBe('Every day · Before breakfast (7:30 AM), At bedtime (10:30 PM) · Until 2026-11-27');
  });
});
