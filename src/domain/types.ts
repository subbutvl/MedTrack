/**
 * Core domain types. These know nothing about any app "mode", so a later Caregiver
 * feature (mode or second app) can reuse them unchanged.
 * Dates are local calendar days as 'YYYY-MM-DD'. Times of day are minutes after midnight.
 */
export type ISODate = string;
export type MinuteOfDay = number;

export type Meal = 'breakfast' | 'lunch' | 'dinner' | 'bedtime';
export type MealTimes = Record<Meal, MinuteOfDay>;

export const DEFAULT_MEAL_TIMES: MealTimes = {
  breakfast: 8 * 60,
  lunch: 13 * 60,
  dinner: 20 * 60,
  bedtime: 22 * 60 + 30,
};

export type DoseSlot =
  | { kind: 'meal'; meal: Meal; relation: 'before' | 'with' | 'after'; offsetMinutes: number; amount: number }
  | { kind: 'clock'; time: MinuteOfDay; amount: number };

export type Frequency =
  | { kind: 'daily' }
  | { kind: 'weekdays'; days: number[] } // 0 = Sunday
  | { kind: 'everyNDays'; n: number }
  | { kind: 'asNeeded' };

/** A tapering phase overrides the slot amount for `days` consecutive days. */
export type TaperPhase = { amount: number; days: number };

export type MedicationSchedule = {
  slots: DoseSlot[];
  frequency: Frequency;
  startDate: ISODate;
  endDate?: ISODate;
  taper?: TaperPhase[];
};

export type PlannedDose = {
  date: ISODate;
  minute: MinuteOfDay;
  amount: number;
  slotIndex: number;
};

export type CheckupRecurrence =
  | { kind: 'months'; every: 1 | 3 | 6 | 12 | number }
  | { kind: 'interval'; every: number; unit: 'days' | 'weeks' | 'months' }
  | { kind: 'dates'; dates: ISODate[] }
  | { kind: 'once' };
