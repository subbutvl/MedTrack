import { StyleSheet, View } from 'react-native';

import { parseClock, toClock } from '@/domain/timeline';
import type { Meal, MealTimes } from '@/domain/types';
import { strings } from '@/i18n/strings';
import { spacing } from '@/theme';
import { Field, Input } from './Form';

export const MEALS: Meal[] = ['breakfast', 'lunch', 'dinner', 'bedtime'];

export type MealDraft = Record<Meal, string>;
export const toDraft = (m: MealTimes): MealDraft =>
  Object.fromEntries(MEALS.map((k) => [k, toClock(m[k])])) as MealDraft;

/** Returns parsed meal times, or the first meal whose time doesn't parse. */
export function parseDraft(d: MealDraft): { ok: true; value: MealTimes } | { ok: false; meal: Meal } {
  const out = {} as MealTimes;
  for (const k of MEALS) {
    const v = parseClock(d[k]);
    if (v == null) return { ok: false, meal: k };
    out[k] = v;
  }
  return { ok: true, value: out };
}

export function MealTimesEditor({ value, onChange, errorMeal }: { value: MealDraft; onChange: (d: MealDraft) => void; errorMeal?: Meal | null }) {
  return (
    <View style={styles.grid}>
      {MEALS.map((meal) => (
        <View key={meal} style={styles.cell}>
          <Field label={strings.meals[meal]} error={errorMeal === meal ? strings.medication.clockInvalid : null}>
            <Input
              value={value[meal]}
              onChangeText={(t) => onChange({ ...value, [meal]: t })}
              keyboardType="numbers-and-punctuation"
              placeholder="08:00"
              accessibilityLabel={`${strings.meals[meal]} time`}
            />
          </Field>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md },
  cell: { flexGrow: 1, flexBasis: '45%' },
});
