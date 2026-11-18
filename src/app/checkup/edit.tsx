import { router, Stack, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { Alert, StyleSheet, View } from 'react-native';

import { AppText } from '@/components/AppText';
import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { ChipGroup, Field, Input } from '@/components/Form';
import { Screen } from '@/components/Screen';
import {
  deleteCheckup,
  getCheckup,
  listDoctors,
  listPeople,
  listVisits,
  markVisited,
  saveCheckup,
  type CheckupVisit,
  type Doctor,
  type Person,
} from '@/db/repo';
import {
  CHECKUP_PRESETS,
  draftToRecurrence,
  initialCheckupDate,
  recurrenceToDraft,
  type RecurrenceDraft,
} from '@/domain/checkups';
import { localToday } from '@/domain/dates';
import { strings } from '@/i18n/strings';
import { spacing } from '@/theme';

const S = strings.checkups;
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

export default function EditCheckupScreen() {
  const params = useLocalSearchParams<{ id?: string; personId?: string }>();
  const [loaded, setLoaded] = useState(false);
  const [people, setPeople] = useState<Person[]>([]);
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [personId, setPersonId] = useState(params.personId ?? '');
  const [doctorId, setDoctorId] = useState<string | null>(null);
  const [title, setTitle] = useState('');
  const [location, setLocation] = useState('');
  const [notes, setNotes] = useState('');
  const [rec, setRec] = useState<RecurrenceDraft>(recurrenceToDraft({ kind: 'months', every: 3 }));
  const [nextDate, setNextDate] = useState(localToday());
  const [visits, setVisits] = useState<CheckupVisit[]>([]);
  const [errors, setErrors] = useState<{ title?: string; rec?: string; next?: string }>({});

  useEffect(() => {
    (async () => {
      const ppl = await listPeople();
      setPeople(ppl);
      if (params.id) {
        const c = await getCheckup(params.id);
        if (c) {
          setPersonId(c.personId);
          setDoctorId(c.doctorId);
          setTitle(c.title);
          setLocation(c.location ?? '');
          setNotes(c.notes ?? '');
          setRec(recurrenceToDraft(c.recurrence));
          setNextDate(c.nextDate ?? '');
          setVisits(await listVisits(c.id));
        }
      } else if (!params.personId && ppl[0]) {
        setPersonId(ppl[0].id);
      }
      setLoaded(true);
    })();
  }, [params.id, params.personId]);

  useEffect(() => {
    if (personId) listDoctors(personId).then(setDoctors);
  }, [personId]);

  if (!loaded) return null;

  const lastVisit = visits.reduce<string | null>((max, v) => (!max || v.visitDate > max ? v.visitDate : max), null);

  const save = async () => {
    const next: typeof errors = {};
    if (!title.trim()) next.title = S.nameRequired;
    const parsed = draftToRecurrence(rec);
    if (parsed.error) next.rec = parsed.error;
    if (rec.kind !== 'dates' && nextDate && !DATE_RE.test(nextDate)) next.next = S.nextDateRequired;
    // A repeating checkup always needs a next date. Only a one-time checkup may be left without one
    // when editing, after it has been visited.
    const needsDate = rec.kind === 'preset' || rec.kind === 'interval' || (rec.kind === 'once' && !params.id);
    if (needsDate && !nextDate) next.next = S.nextDateRequired;
    setErrors(next);
    if (Object.keys(next).length || !parsed.value) return;

    await saveCheckup(
      {
        personId,
        doctorId,
        title: title.trim(),
        location: location.trim() || null,
        notes: notes.trim() || null,
        recurrence: parsed.value,
        nextDate: initialCheckupDate(parsed.value, nextDate || null, localToday(), lastVisit) ?? null,
      },
      params.id,
    );
    router.back();
  };

  const visited = async () => {
    const next = await markVisited(params.id!, localToday());
    Alert.alert(next ? S.visitedNext(next) : S.visitedNoNext);
    router.back();
  };

  const remove = () =>
    Alert.alert(S.deleteConfirm(title), undefined, [
      { text: strings.common.cancel, style: 'cancel' },
      {
        text: strings.common.delete,
        style: 'destructive',
        onPress: async () => {
          await deleteCheckup(params.id!);
          router.back();
        },
      },
    ]);

  return (
    <Screen edges={['left', 'right', 'bottom']}>
      <Stack.Screen options={{ title: params.id ? S.editTitle : S.newTitle }} />

      <Field label={S.name} error={errors.title}>
        <Input value={title} onChangeText={setTitle} placeholder={S.namePlaceholder} autoFocus={!params.id} />
      </Field>

      {people.length > 1 ? (
        <Field label={S.person}>
          <ChipGroup
            value={personId}
            onChange={(v) => {
              setPersonId(v);
              setDoctorId(null);
            }}
            options={people.map((p) => ({ value: p.id, label: p.isSelf ? strings.people.me : p.name }))}
          />
        </Field>
      ) : null}

      {doctors.length ? (
        <Field label={S.doctor}>
          <ChipGroup
            value={doctorId ?? ''}
            onChange={(v) => setDoctorId(v || null)}
            options={[{ value: '', label: S.noDoctor }, ...doctors.map((d) => ({ value: d.id, label: d.name }))]}
          />
        </Field>
      ) : null}

      <Field label={S.location}>
        <Input value={location} onChangeText={setLocation} />
      </Field>

      <Card>
        <Field label={S.repeat} error={errors.rec}>
          <ChipGroup
            value={rec.kind}
            onChange={(kind) => setRec({ ...rec, kind })}
            options={(Object.keys(S.repeatKinds) as RecurrenceDraft['kind'][]).map((k) => ({ value: k, label: S.repeatKinds[k] }))}
          />
        </Field>
        {rec.kind === 'preset' ? (
          <ChipGroup
            value={rec.preset}
            onChange={(preset) => setRec({ ...rec, preset })}
            options={CHECKUP_PRESETS.map((n) => ({ value: n, label: S.presets[n] }))}
          />
        ) : null}
        {rec.kind === 'interval' ? (
          <View style={styles.row}>
            <View style={styles.every}>
              <Input value={rec.every} onChangeText={(every) => setRec({ ...rec, every })} keyboardType="number-pad" accessibilityLabel={S.every} />
            </View>
            <View style={styles.flex}>
              <ChipGroup
                value={rec.unit}
                onChange={(unit) => setRec({ ...rec, unit })}
                options={(['days', 'weeks', 'months'] as const).map((u) => ({ value: u, label: S.units[u] }))}
              />
            </View>
          </View>
        ) : null}
        {rec.kind === 'dates' ? (
          <Field label={S.dates} hint={S.datesHint}>
            <Input value={rec.dates} onChangeText={(dates) => setRec({ ...rec, dates })} keyboardType="numbers-and-punctuation" multiline />
          </Field>
        ) : (
          <Field label={S.nextDate} hint="YYYY-MM-DD" error={errors.next}>
            <Input value={nextDate} onChangeText={setNextDate} keyboardType="numbers-and-punctuation" />
          </Field>
        )}
      </Card>

      <Field label={S.notes}>
        <Input value={notes} onChangeText={setNotes} multiline />
      </Field>

      <Button label={strings.common.save} onPress={save} />
      {params.id ? <Button label={S.markVisited} variant="secondary" onPress={visited} /> : null}

      {visits.length ? (
        <Card>
          <AppText variant="label" tone="muted">
            {S.lastVisits}
          </AppText>
          {visits.map((v) => (
            <AppText key={v.id}>
              {v.visitDate}
              {v.notes ? ` · ${v.notes}` : ''}
            </AppText>
          ))}
        </Card>
      ) : null}

      {params.id ? <Button label={strings.common.delete} variant="ghost" onPress={remove} /> : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  every: { width: 80 },
  flex: { flex: 1 },
});
