import { groupByTimeOfDay } from '../medicineGroups';
import { DEFAULT_MEAL_TIMES, type MedicationSchedule } from '../types';

const sched = (slots: MedicationSchedule['slots'], kind: 'daily' | 'asNeeded' = 'daily'): MedicationSchedule => ({
  slots,
  frequency: { kind },
  startDate: '2026-11-01',
});
const meal = (m: 'breakfast' | 'lunch' | 'dinner' | 'bedtime') => ({ kind: 'meal' as const, meal: m, relation: 'after' as const, offsetMinutes: 0, amount: 1 });

describe('groupByTimeOfDay', () => {
  it('groups by part of the day like Today, ordered by time then name', () => {
    const meds = [
      { name: 'Zeta', schedule: sched([meal('breakfast')]) },
      { name: 'Metformin', schedule: sched([meal('breakfast'), meal('dinner')]) },
      { name: 'Atorva', schedule: sched([meal('bedtime')]) },
      { name: 'Paracetamol', schedule: sched([], 'asNeeded') },
      { name: 'Alpha', schedule: sched([{ kind: 'clock', time: 7 * 60, amount: 1 }]) },
    ];
    const groups = groupByTimeOfDay(meds, () => DEFAULT_MEAL_TIMES);
    expect(groups.map((g) => g.group)).toEqual(['morning', 'evening', 'night', 'asNeeded']);
    expect(groups[0].items.map((i) => i.med.name)).toEqual(['Alpha', 'Metformin', 'Zeta']);
    expect(groups[1].items.map((i) => i.med.name)).toEqual(['Metformin']);
    expect(groups[2].items.map((i) => i.med.name)).toEqual(['Atorva']);
    expect(groups[3].items[0].minute).toBeNull();
  });

  it('lists a medicine once per group even with two doses in the same part of the day', () => {
    const groups = groupByTimeOfDay([{ name: 'X', schedule: sched([{ kind: 'clock', time: 420, amount: 1 }, { kind: 'clock', time: 600, amount: 1 }]) }], () => DEFAULT_MEAL_TIMES);
    expect(groups).toHaveLength(1);
    expect(groups[0].items).toHaveLength(1);
    expect(groups[0].items[0].minute).toBe(420);
  });
});
