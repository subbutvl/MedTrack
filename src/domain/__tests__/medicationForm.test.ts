import { draftFromSchedule, emptyDraft, scheduleFromDraft } from '../medicationForm';

describe('medication form', () => {
  it('converts a meal-based draft with a 10-day course', () => {
    const d = { ...emptyDraft('2026-11-18'), durationDays: '10' };
    d.slots = [{ kind: 'meal', meal: 'breakfast', relation: 'before', offset: '30', amount: '1' }];
    const { schedule, errors } = scheduleFromDraft(d);
    expect(errors).toEqual({});
    expect(schedule).toEqual({
      slots: [{ kind: 'meal', meal: 'breakfast', relation: 'before', offsetMinutes: 30, amount: 1 }],
      frequency: { kind: 'daily' },
      startDate: '2026-11-18',
      endDate: '2026-11-27',
    });
  });

  it('derives the end date from taper steps', () => {
    const d = { ...emptyDraft('2026-11-01'), taperOn: true };
    const { schedule } = scheduleFromDraft(d);
    expect(schedule?.taper).toEqual([
      { amount: 2, days: 5 },
      { amount: 1, days: 5 },
    ]);
    expect(schedule?.endDate).toBe('2026-11-10');
  });

  it('reports invalid input', () => {
    const d = emptyDraft('bad');
    d.slots = [{ kind: 'clock', time: '25:00', amount: '1' }];
    d.frequency = 'everyNDays';
    d.everyN = '0';
    const { schedule, errors } = scheduleFromDraft(d);
    expect(schedule).toBeUndefined();
    expect(Object.keys(errors).sort()).toEqual(['everyN', 'slots', 'startDate']);
  });

  it('round-trips a stored schedule', () => {
    const d = { ...emptyDraft('2026-11-18'), durationDays: '7', frequency: 'weekdays' as const, weekdays: [1, 3] };
    const first = scheduleFromDraft(d).schedule!;
    expect(scheduleFromDraft(draftFromSchedule(first)).schedule).toEqual(first);
  });
});
