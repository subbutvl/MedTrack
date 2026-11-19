import { checkupDays, dayProgress, dosesOn, monthGrid, monthGridRange, shiftMonth, startOfWeek, weekOf } from '../calendar';
import type { TimelineMedication } from '../timeline';
import { DEFAULT_MEAL_TIMES } from '../types';

describe('week and month helpers', () => {
  it('builds a Sunday-first week around any date', () => {
    // 2026-11-19 is a Thursday.
    expect(startOfWeek('2026-11-19')).toBe('2026-11-15');
    expect(startOfWeek('2026-11-15')).toBe('2026-11-15');
    expect(weekOf('2026-11-21')).toEqual([
      '2026-11-15', '2026-11-16', '2026-11-17', '2026-11-18', '2026-11-19', '2026-11-20', '2026-11-21',
    ]);
  });

  it('lays out a month as whole weeks with blanks outside the month', () => {
    // November 2026 starts on a Sunday and ends on a Monday.
    const nov = monthGrid('2026-11-19');
    expect(nov).toHaveLength(5);
    expect(nov[0][0]).toBe('2026-11-01');
    expect(nov[4]).toEqual(['2026-11-29', '2026-11-30', null, null, null, null, null]);
    // February 2026 fills exactly four weeks.
    expect(monthGrid('2026-02-10')).toHaveLength(4);
    expect(monthGridRange('2026-12-05')).toEqual({ from: '2026-11-29', to: '2027-01-02' });
  });

  it('moves between months across a year end', () => {
    expect(shiftMonth('2026-12-31', 1)).toBe('2027-01-01');
    expect(shiftMonth('2026-01-31', -1)).toBe('2025-12-01');
  });
});

describe('dose progress per day', () => {
  const med: TimelineMedication = {
    id: 'm1',
    personId: 'p1',
    name: 'Metformin',
    meals: DEFAULT_MEAL_TIMES,
    schedule: { slots: [{ kind: 'clock', time: 8 * 60, amount: 1 }, { kind: 'clock', time: 20 * 60, amount: 1 }], frequency: { kind: 'daily' }, startDate: '2026-11-01' },
  };
  const events = [{ medicationId: 'm1', plannedDate: '2026-11-18', slotIndex: 0, status: 'taken' as const }];

  it('counts an unlogged dose on a past day as missed', () => {
    const p = dayProgress(dosesOn([med], events, '2026-11-18', '2026-11-19', 600));
    expect(p).toEqual({ planned: 2, taken: 1, skipped: 0, missed: 1 });
  });

  it('keeps later days upcoming and nothing before the start date', () => {
    expect(dosesOn([med], [], '2026-11-25', '2026-11-19', 600).map((d) => d.status)).toEqual(['pending', 'pending']);
    expect(dosesOn([med], [], '2026-10-30', '2026-11-19', 600)).toEqual([]);
  });
});

describe('checkupDays', () => {
  const c = { id: 'c1', title: 'HbA1c', recurrence: { kind: 'months' as const, every: 1 }, nextDate: '2026-11-25' };

  it('shows visits, the next date and the repeats after it', () => {
    const days = checkupDays([c], [{ checkupId: 'c1', visitDate: '2026-10-25' }], '2026-10-01', '2027-01-31', '2026-11-19');
    expect(days.get('2026-10-25')?.[0].kind).toBe('visited');
    expect(days.get('2026-11-25')?.[0].kind).toBe('scheduled');
    expect(days.get('2026-12-25')?.[0].kind).toBe('expected');
    expect(days.get('2027-01-25')?.[0].kind).toBe('expected');
    expect(days.size).toBe(4);
  });

  it('marks a passed next date as overdue and counts repeats from today', () => {
    const days = checkupDays([{ ...c, nextDate: '2026-11-10' }], [], '2026-11-01', '2026-12-31', '2026-11-19');
    expect(days.get('2026-11-10')?.[0].kind).toBe('overdue');
    expect(days.get('2026-12-19')?.[0].kind).toBe('expected');
  });
});
