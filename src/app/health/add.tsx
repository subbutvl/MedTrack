import { router, Stack, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { AppText } from '@/components/AppText';
import { Button } from '@/components/Button';
import { ChipGroup, Field, Input } from '@/components/Form';
import { Screen } from '@/components/Screen';
import { addReading, addSideEffect, listMedications, type Medication, type Severity } from '@/db/repo';
import { emptyReadingDraft, parseReading, READING_TYPES, type ReadingDraft, type ReadingType, type SugarContext } from '@/domain/readings';
import { strings } from '@/i18n/strings';
import { spacing } from '@/theme';

const H = strings.health;
type Kind = ReadingType | 'side_effect';

export default function AddHealthEntryScreen() {
  const { personId, type } = useLocalSearchParams<{ personId: string; type?: Kind }>();
  const [kind, setKind] = useState<Kind>(type ?? 'bp');
  const [draft, setDraft] = useState<ReadingDraft>(emptyReadingDraft());
  const [description, setDescription] = useState('');
  const [severity, setSeverity] = useState<Severity>('mild');
  const [medicationId, setMedicationId] = useState<string>('');
  const [meds, setMeds] = useState<Medication[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    listMedications(personId).then(setMeds);
  }, [personId]);

  const patch = (p: Partial<ReadingDraft>) => setDraft((d) => ({ ...d, ...p }));

  const save = async () => {
    if (kind === 'side_effect') {
      if (!description.trim()) return setError(H.describeRequired);
      await addSideEffect({ personId, medicationId: medicationId || null, description: description.trim(), severity });
    } else {
      const { value, error: e } = parseReading(kind, draft);
      if (!value) return setError(e ?? null);
      await addReading(personId, value);
    }
    router.back();
  };

  return (
    <Screen edges={['left', 'right', 'bottom']}>
      <Stack.Screen options={{ title: H.addTitle }} />

      <ChipGroup<Kind>
        value={kind}
        onChange={(k) => {
          setKind(k);
          setError(null);
        }}
        options={[...READING_TYPES.map((t) => ({ value: t as Kind, label: H.types[t] })), { value: 'side_effect', label: H.sideEffect }]}
      />

      {kind === 'bp' ? (
        <View style={styles.row}>
          <View style={styles.flex}>
            <Field label={H.sys}>
              <Input value={draft.sys} onChangeText={(sys) => patch({ sys })} keyboardType="number-pad" placeholder="120" autoFocus />
            </Field>
          </View>
          <View style={styles.flex}>
            <Field label={H.dia}>
              <Input value={draft.dia} onChangeText={(dia) => patch({ dia })} keyboardType="number-pad" placeholder="80" />
            </Field>
          </View>
          <View style={styles.flex}>
            <Field label={H.pulse}>
              <Input value={draft.pulse} onChangeText={(pulse) => patch({ pulse })} keyboardType="number-pad" placeholder="72" />
            </Field>
          </View>
        </View>
      ) : null}

      {kind === 'sugar' || kind === 'weight' || kind === 'temperature' || kind === 'spo2' ? (
        <Field label={`${H.types[kind]} (${H.value[kind]})`}>
          <Input value={draft.value} onChangeText={(value) => patch({ value })} keyboardType="decimal-pad" autoFocus />
        </Field>
      ) : null}

      {kind === 'sugar' ? (
        <ChipGroup<SugarContext>
          value={draft.context}
          onChange={(context) => patch({ context })}
          options={(Object.keys(H.contexts) as SugarContext[]).map((c) => ({ value: c, label: H.contexts[c] }))}
        />
      ) : null}

      {kind === 'side_effect' ? (
        <>
          <Field label={H.describe}>
            <Input value={description} onChangeText={setDescription} placeholder={H.describePlaceholder} multiline autoFocus />
          </Field>
          <Field label={H.severity}>
            <ChipGroup<Severity>
              value={severity}
              onChange={setSeverity}
              options={(Object.keys(H.severities) as Severity[]).map((s) => ({ value: s, label: H.severities[s] }))}
            />
          </Field>
          {meds.length ? (
            <Field label={H.relatedMedicine}>
              <ChipGroup
                value={medicationId}
                onChange={setMedicationId}
                options={[{ value: '', label: H.noMedicine }, ...meds.map((m) => ({ value: m.id, label: m.name }))]}
              />
            </Field>
          ) : null}
        </>
      ) : null}

      {error ? <AppText tone="danger">{error}</AppText> : null}
      <Button label={strings.common.save} onPress={save} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', gap: spacing.sm },
  flex: { flex: 1 },
});
