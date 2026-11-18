import { router } from 'expo-router';
import { useEffect, useState } from 'react';

import { AppText } from '@/components/AppText';
import { Button } from '@/components/Button';
import { MealTimesEditor, parseDraft, toDraft, type MealDraft } from '@/components/MealTimesEditor';
import { Screen } from '@/components/Screen';
import { getGlobalMealTimes, setGlobalMealTimes } from '@/db/repo';
import type { Meal } from '@/domain/types';
import { strings } from '@/i18n/strings';

export default function MealTimesScreen() {
  const [draft, setDraft] = useState<MealDraft | null>(null);
  const [errorMeal, setErrorMeal] = useState<Meal | null>(null);

  useEffect(() => {
    getGlobalMealTimes().then((m) => setDraft(toDraft(m)));
  }, []);

  if (!draft) return null;

  const save = async () => {
    const parsed = parseDraft(draft);
    if (!parsed.ok) return setErrorMeal(parsed.meal);
    await setGlobalMealTimes(parsed.value); // the reminder engine re-plans when data changes
    router.back();
  };

  return (
    <Screen edges={['left', 'right', 'bottom']}>
      <AppText tone="muted">{strings.settings.mealTimesHint}</AppText>
      <MealTimesEditor value={draft} onChange={setDraft} errorMeal={errorMeal} />
      <Button label={strings.common.save} onPress={save} />
    </Screen>
  );
}
