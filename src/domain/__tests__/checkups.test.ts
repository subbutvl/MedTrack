import {
  describeRecurrence,
  draftToRecurrence,
  initialCheckupDate,
  planCheckupNotifications,
  recurrenceToDraft,
} from '../checkups';
import type { CheckupRecurrence } from '../types';

describe('checkup helpers', () => {
  it('picks the first upcoming listed date', () => {
    expect(initialCheckupDate({ kind: 'dates', dates: ['2026-12-01', '2026-11-01'] }, null, '2026-11-18')).toBe('2026-12-01');
    expect(initialCheckupDate({ kind: 'months', every: 3 }, '2026-12-05', '2026-11-18')).toBe('2026-12-05');
  });

  it('describes recurrence', () => {
    expect(describeRecurrence({ kind: 'months', every: 12 })).toBe('Every year');
    expect(describeRecurrence({ kind: 'months', every: 3 })).toBe('Every 3 months');
    expect(describeRecurrence({ kind: 'interval', every: 1, unit: 'weeks' })).toBe('Every 1 week');
  });

  it('round-trips drafts and validates', () => {
    for (const r of [
      { kind: 'months', every: 6 },
      { kind: 'interval', every: 10, unit: 'days' },
      { kind: 'dates', dates: ['2026-12-01', '2027-01-15'] },
      { kind: 'once' },
    ] as CheckupRecurrence[]) {
      expect(draftToRecurrence(recurrenceToDraft(r)).value).toEqual(r);
    }
    expect(draftToRecurrence({ ...recurrenceToDraft({ kind: 'once' }), kind: 'dates', dates: '2026-13' }).error).toBeTruthy();
  });

  it('plans evening-before and morning-of reminders, skipping the past', () => {
    const plan = planCheckupNotifications(
      [
        { id: 'a', nextDate: '2026-11-19' },
        { id: 'b', nextDate: '2026-11-18' },
        { id: 'c', nextDate: null },
      ],
      '2026-11-18',
      12 * 60,
    );
    expect(plan.map((p) => `${p.checkupId}:${p.kind}:${p.date}`)).toEqual(['a:dayBefore:2026-11-18', 'a:morningOf:2026-11-19']);
  });
});
