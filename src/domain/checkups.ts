import { addDays, addMonths } from './dates';
import type { CheckupRecurrence, ISODate } from './types';

/**
 * The next checkup date after a visit on `visitDate`.
 * Interval recurrences count from the actual visit date, so a late visit pushes the next one out.
 * Specific-date lists return the first listed date after the visit.
 * Returns undefined when nothing further is scheduled.
 */
export function nextCheckupDate(rule: CheckupRecurrence, visitDate: ISODate): ISODate | undefined {
  switch (rule.kind) {
    case 'once':
      return undefined;
    case 'months':
      return addMonths(visitDate, rule.every);
    case 'interval':
      if (rule.unit === 'days') return addDays(visitDate, rule.every);
      if (rule.unit === 'weeks') return addDays(visitDate, rule.every * 7);
      return addMonths(visitDate, rule.every);
    case 'dates':
      return [...rule.dates].sort().find((d) => d > visitDate);
  }
}

export const CHECKUP_PRESETS = [1, 3, 6, 12] as const;
