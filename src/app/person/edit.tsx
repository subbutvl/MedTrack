import { router, Stack, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { Alert } from 'react-native';

import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { Field, Input, ToggleRow } from '@/components/Form';
import { MealTimesEditor, parseDraft, toDraft, type MealDraft } from '@/components/MealTimesEditor';
import { Screen } from '@/components/Screen';
import { deletePerson, getGlobalMealTimes, getPerson, savePerson } from '@/db/repo';
import type { Meal } from '@/domain/types';
import { strings } from '@/i18n/strings';

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

export default function EditPersonScreen() {
  const { id } = useLocalSearchParams<{ id?: string }>();
  const [loaded, setLoaded] = useState(!id);
  const [isSelf, setIsSelf] = useState(false);
  const [name, setName] = useState('');
  const [dob, setDob] = useState('');
  const [notes, setNotes] = useState('');
  const [ownMeals, setOwnMeals] = useState(false);
  const [meals, setMeals] = useState<MealDraft | null>(null);
  const [errors, setErrors] = useState<{ name?: string; dob?: string; meal?: Meal | null }>({});

  useEffect(() => {
    (async () => {
      const global = await getGlobalMealTimes();
      if (!id) return setMeals(toDraft(global));
      const p = await getPerson(id);
      if (p) {
        setIsSelf(p.isSelf);
        setName(p.isSelf ? '' : p.name);
        setDob(p.dateOfBirth ?? '');
        setNotes(p.notes ?? '');
        setOwnMeals(!!p.mealTimes);
        setMeals(toDraft(p.mealTimes ?? global));
      }
      setLoaded(true);
    })();
  }, [id]);

  if (!loaded || !meals) return null;

  const save = async () => {
    const next: typeof errors = {};
    const finalName = isSelf ? strings.people.me : name.trim();
    if (!finalName) next.name = strings.people.nameRequired;
    if (dob && !DATE_RE.test(dob)) next.dob = strings.medication.invalidDate;
    const parsed = ownMeals ? parseDraft(meals) : null;
    if (parsed && !parsed.ok) next.meal = parsed.meal;
    setErrors(next);
    if (Object.keys(next).length) return;

    await savePerson(
      {
        name: finalName,
        color: null,
        dateOfBirth: dob || null,
        notes: notes.trim() || null,
        mealTimes: parsed && parsed.ok ? parsed.value : null,
      },
      id,
    );
    router.back();
  };

  const remove = () =>
    Alert.alert(strings.people.deleteConfirm(name), undefined, [
      { text: strings.common.cancel, style: 'cancel' },
      {
        text: strings.common.remove,
        style: 'destructive',
        onPress: async () => {
          await deletePerson(id!);
          router.back();
        },
      },
    ]);

  return (
    <Screen edges={['left', 'right', 'bottom']}>
      <Stack.Screen options={{ title: id ? strings.people.editTitle : strings.people.newTitle }} />

      {!isSelf ? (
        <Field label={strings.people.name} error={errors.name}>
          <Input value={name} onChangeText={setName} placeholder={strings.people.namePlaceholder} autoFocus={!id} />
        </Field>
      ) : null}

      <Field label={strings.people.dob} hint={strings.people.dobHint} error={errors.dob}>
        <Input value={dob} onChangeText={setDob} placeholder="1955-04-12" keyboardType="numbers-and-punctuation" />
      </Field>

      <Card>
        <ToggleRow label={strings.people.ownMealTimes} value={ownMeals} onValueChange={setOwnMeals} />
        {ownMeals ? <MealTimesEditor value={meals} onChange={setMeals} errorMeal={errors.meal} /> : null}
      </Card>

      <Field label={strings.people.notes}>
        <Input value={notes} onChangeText={setNotes} multiline />
      </Field>

      <Button label={strings.common.save} onPress={save} />
      {id && !isSelf ? <Button label={strings.common.remove} variant="ghost" onPress={remove} /> : null}
    </Screen>
  );
}
