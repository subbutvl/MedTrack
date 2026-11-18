import { nextCheckupDate } from '../checkups';
import { addMonths } from '../dates';
import { planDoseNotifications } from '../notificationPlan';
import { dailyUse, dosesForDay, slotMinute } from '../schedule';
import { drugSearchUrl } from '../search';
import { forecastStock } from '../stock';
import { DEFAULT_MEAL_TIMES, type MedicationSchedule } from '../types';

const meals = DEFAULT_MEAL_TIMES;

describe('slotMinute', () => {
  it('resolves meal-relative slots', () => {
    expect(slotMinute({ kind: 'meal', meal: 'breakfast', relation: 'before', offsetMinutes: 30, amount: 1 }, meals)).toBe(7 * 60 + 30);
    expect(slotMinute({ kind: 'meal', meal: 'dinner', relation: 'after', offsetMinutes: 15, amount: 1 }, meals)).toBe(20 * 60 + 15);
    expect(slotMinute({ kind: 'meal', meal: 'lunch', relation: 'with', offsetMinutes: 99, amount: 1 }, meals)).toBe(13 * 60);
  });
});

describe('dosesForDay', () => {
  const base: MedicationSchedule = {
    slots: [
      { kind: 'meal', meal: 'dinner', relation: 'after', offsetMinutes: 0, amount: 1 },
      { kind: 'meal', meal: 'breakfast', relation: 'before', offsetMinutes: 30, amount: 1 },
    ],
    frequency: { kind: 'daily' },
    startDate: '2026-11-18',
    endDate: '2026-11-27',
  };

  it('sorts doses by time and respects the course window', () => {
    expect(dosesForDay(base, '2026-11-18', meals).map((d) => d.minute)).toEqual([450, 1200]);
    expect(dosesForDay(base, '2026-11-17', meals)).toEqual([]);
    expect(dosesForDay(base, '2026-11-28', meals)).toEqual([]);
  });

  it('applies tapering phases and stops after the last one', () => {
    const taper: MedicationSchedule = {
      slots: [{ kind: 'clock', time: 9 * 60, amount: 1 }],
      frequency: { kind: 'daily' },
      startDate: '2026-11-01',
      taper: [
        { amount: 3, days: 2 },
        { amount: 2, days: 2 },
        { amount: 1, days: 2 },
      ],
    };
    const amounts = ['01', '02', '03', '04', '05', '06', '07'].map((d) => dosesForDay(taper, `2026-11-${d}`, meals)[0]?.amount ?? 0);
    expect(amounts).toEqual([3, 3, 2, 2, 1, 1, 0]);
  });

  it('handles weekday and every-N-day frequencies', () => {
    const mwf: MedicationSchedule = { ...base, endDate: undefined, frequency: { kind: 'weekdays', days: [1, 3, 5] } };
    expect(dosesForDay(mwf, '2026-11-18', meals)).toHaveLength(2); // Wednesday
    expect(dosesForDay(mwf, '2026-11-19', meals)).toHaveLength(0); // Thursday
    const alt: MedicationSchedule = { ...base, endDate: undefined, frequency: { kind: 'everyNDays', n: 2 } };
    expect(dosesForDay(alt, '2026-11-19', meals)).toHaveLength(0);
    expect(dosesForDay(alt, '2026-11-20', meals)).toHaveLength(2);
  });
});

describe('checkups', () => {
  it('schedules from the visit date and clamps month ends', () => {
    expect(nextCheckupDate({ kind: 'months', every: 3 }, '2026-11-30')).toBe('2027-02-28');
    expect(addMonths('2028-01-31', 1)).toBe('2028-02-29');
    expect(nextCheckupDate({ kind: 'interval', every: 2, unit: 'weeks' }, '2026-12-25')).toBe('2027-01-08');
    expect(nextCheckupDate({ kind: 'dates', dates: ['2027-03-01', '2026-12-01'] }, '2026-11-20')).toBe('2026-12-01');
    expect(nextCheckupDate({ kind: 'once' }, '2026-11-20')).toBeUndefined();
  });
});

describe('stock', () => {
  it('sums use across medications sharing one stock item', () => {
    const daily: MedicationSchedule = { slots: [{ kind: 'clock', time: 480, amount: 1 }], frequency: { kind: 'daily' }, startDate: '2026-11-01' };
    const amma = dailyUse(daily, '2026-11-18', meals);
    const appa = dailyUse(daily, '2026-11-18', meals);
    expect(forecastStock(10, [amma, appa])).toEqual({ daysLeft: 5, low: true });
    expect(forecastStock(30, [amma, appa]).low).toBe(false);
    expect(forecastStock(5, []).daysLeft).toBe(Infinity);
  });
});

describe('notification plan', () => {
  it('skips past doses today and caps to the limit', () => {
    const s: MedicationSchedule = {
      slots: [
        { kind: 'clock', time: 8 * 60, amount: 1 },
        { kind: 'clock', time: 20 * 60, amount: 1 },
      ],
      frequency: { kind: 'daily' },
      startDate: '2026-11-01',
    };
    const plan = planDoseNotifications([{ medicationId: 'm1', personId: 'p1', schedule: s, meals }], '2026-11-18', 12 * 60);
    expect(plan.map((p) => `${p.date}@${p.minute}`)).toEqual(['2026-11-18@1200', '2026-11-19@480', '2026-11-19@1200']);
    expect(planDoseNotifications([{ medicationId: 'm1', personId: 'p1', schedule: s, meals }], '2026-11-18', 0, { days: 30, limit: 5 })).toHaveLength(5);
  });
});

it('builds an encoded search URL', () => {
  expect(drugSearchUrl(' Metformin 500 ')).toBe('https://www.google.com/search?q=Metformin%20500%20medicine');
});
