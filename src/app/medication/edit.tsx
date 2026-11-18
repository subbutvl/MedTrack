import { Ionicons } from '@expo/vector-icons';
import { router, Stack, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { Alert, Pressable, StyleSheet, View } from 'react-native';

import { AppText } from '@/components/AppText';
import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { Chip, ChipGroup, ChipRow, Field, Input, ToggleRow } from '@/components/Form';
import { MEALS } from '@/components/MealTimesEditor';
import { Screen } from '@/components/Screen';
import {
  createStock,
  deleteMedication,
  getMedication,
  listDoctors,
  listStock,
  saveMedication,
  type Doctor,
  type StockItem,
} from '@/db/repo';
import { localToday } from '@/domain/dates';
import {
  draftFromSchedule,
  emptyDraft,
  newSlot,
  scheduleFromDraft,
  type DraftErrors,
  type ScheduleDraft,
  type SlotDraft,
} from '@/domain/medicationForm';
import { strings } from '@/i18n/strings';
import { spacing, useTheme } from '@/theme';

const S = strings.medication;
type FormKey = keyof typeof S.forms;
type StockMode = 'none' | 'new' | 'existing';

export default function EditMedicationScreen() {
  const params = useLocalSearchParams<{ id?: string; personId?: string }>();
  const { colors } = useTheme();
  const [loaded, setLoaded] = useState(false);
  const [personId, setPersonId] = useState(params.personId ?? '');
  const [name, setName] = useState('');
  const [strength, setStrength] = useState('');
  const [form, setForm] = useState<FormKey>('tablet');
  const [notes, setNotes] = useState('');
  const [draft, setDraft] = useState<ScheduleDraft>(() => emptyDraft(localToday()));
  const [stockList, setStockList] = useState<StockItem[]>([]);
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [doctorId, setDoctorId] = useState<string | null>(null);
  const [stockMode, setStockMode] = useState<StockMode>('none');
  const [stockId, setStockId] = useState<string | null>(null);
  const [stockQty, setStockQty] = useState('30');
  const [stockThreshold, setStockThreshold] = useState('5');
  const [errors, setErrors] = useState<DraftErrors & { name?: string; stock?: string }>({});

  useEffect(() => {
    (async () => {
      const stock = await listStock();
      setStockList(stock);
      if (params.id) {
        const m = await getMedication(params.id);
        if (m) {
          setPersonId(m.personId);
          setDoctorId(m.doctorId);
          setName(m.name);
          setStrength(m.strength ?? '');
          setForm((m.form as FormKey) ?? 'tablet');
          setNotes(m.notes ?? '');
          setDraft(draftFromSchedule(m.schedule));
          if (m.stockItemId) {
            setStockMode('existing');
            setStockId(m.stockItemId);
          }
        }
      }
      setLoaded(true);
    })();
  }, [params.id]);

  useEffect(() => {
    if (personId) listDoctors(personId).then(setDoctors);
  }, [personId]);

  if (!loaded) return null;

  const patch = (p: Partial<ScheduleDraft>) => setDraft((d) => ({ ...d, ...p }));
  const patchSlot = (i: number, p: Partial<SlotDraft>) =>
    setDraft((d) => ({ ...d, slots: d.slots.map((s, j) => (j === i ? ({ ...s, ...p } as SlotDraft) : s)) }));

  const save = async () => {
    const { schedule, errors: e } = scheduleFromDraft(draft);
    const all: typeof errors = { ...e };
    if (!name.trim()) all.name = S.nameRequired;
    if (stockMode === 'existing' && !stockId) all.stock = S.stockShareHint;
    if (stockMode === 'new' && !(Number(stockQty) >= 0)) all.stock = S.stockQuantity;
    setErrors(all);
    if (Object.keys(all).length || !schedule) return;

    let stockItemId: string | null = null;
    if (stockMode === 'existing') stockItemId = stockId;
    if (stockMode === 'new') {
      stockItemId = await createStock({
        name: name.trim(),
        strength: strength.trim() || null,
        unit: form,
        quantity: Number(stockQty) || 0,
        thresholdDays: Math.max(1, Math.round(Number(stockThreshold) || 5)),
      });
    }

    await saveMedication(
      {
        personId,
        doctorId,
        stockItemId,
        name: name.trim(),
        strength: strength.trim() || null,
        form,
        schedule,
        notes: notes.trim() || null,
      },
      params.id,
    );
    router.back();
  };

  const remove = () =>
    Alert.alert(S.deleteConfirm(name), undefined, [
      { text: strings.common.cancel, style: 'cancel' },
      {
        text: strings.common.delete,
        style: 'destructive',
        onPress: async () => {
          await deleteMedication(params.id!);
          router.back();
        },
      },
    ]);

  return (
    <Screen edges={['left', 'right', 'bottom']}>
      <Stack.Screen options={{ title: params.id ? S.editTitle : S.newTitle }} />

      <Field label={S.name} error={errors.name}>
        <Input value={name} onChangeText={setName} placeholder={S.namePlaceholder} autoFocus={!params.id} />
      </Field>
      <Field label={S.strength}>
        <Input value={strength} onChangeText={setStrength} placeholder={S.strengthPlaceholder} />
      </Field>
      <Field label={S.form}>
        <ChipGroup
          value={form}
          onChange={setForm}
          options={(Object.keys(S.forms) as FormKey[]).map((k) => ({ value: k, label: S.forms[k] }))}
        />
      </Field>

      {doctors.length ? (
        <Field label={S.doctor}>
          <ChipGroup
            value={doctorId ?? ''}
            onChange={(v) => setDoctorId(v || null)}
            options={[{ value: '', label: S.noDoctor }, ...doctors.map((d) => ({ value: d.id, label: d.name }))]}
          />
        </Field>
      ) : null}

      <Field label={S.frequency} error={errors.weekdays ?? errors.everyN}>
        <ChipGroup
          value={draft.frequency}
          onChange={(frequency) => patch({ frequency })}
          options={(Object.keys(S.frequencies) as (keyof typeof S.frequencies)[]).map((k) => ({ value: k, label: S.frequencies[k] }))}
        />
        {draft.frequency === 'weekdays' ? (
          <ChipRow>
            {S.weekdays.map((label, day) => (
              <Chip
                key={label}
                label={label}
                selected={draft.weekdays.includes(day)}
                onPress={() =>
                  patch({ weekdays: draft.weekdays.includes(day) ? draft.weekdays.filter((d) => d !== day) : [...draft.weekdays, day] })
                }
              />
            ))}
          </ChipRow>
        ) : null}
        {draft.frequency === 'everyNDays' ? (
          <Input value={draft.everyN} onChangeText={(everyN) => patch({ everyN })} keyboardType="number-pad" accessibilityLabel={S.everyN} />
        ) : null}
      </Field>

      {draft.frequency !== 'asNeeded' ? (
        <Field label={S.when} error={errors.slots}>
          {draft.slots.map((slot, i) => (
            <Card key={i}>
              <View style={styles.slotHeader}>
                <ChipGroup
                  wrap
                  value={slot.kind}
                  onChange={(kind) =>
                    patchSlot(i, kind === 'meal' ? { ...newSlot(), amount: slot.amount } : ({ kind: 'clock', time: '09:00', amount: slot.amount } as SlotDraft))
                  }
                  options={[
                    { value: 'meal', label: S.slotMeal },
                    { value: 'clock', label: S.slotClock },
                  ]}
                />
                {draft.slots.length > 1 ? (
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={strings.common.remove}
                    hitSlop={8}
                    onPress={() => patch({ slots: draft.slots.filter((_, j) => j !== i) })}
                  >
                    <Ionicons name="trash-outline" size={20} color={colors.danger} />
                  </Pressable>
                ) : null}
              </View>

              {slot.kind === 'meal' ? (
                <>
                  <ChipGroup
                    wrap
                    value={slot.meal}
                    onChange={(meal) => patchSlot(i, { meal })}
                    options={MEALS.map((m) => ({ value: m, label: strings.meals[m] }))}
                  />
                  {slot.meal !== 'bedtime' ? (
                    <ChipGroup
                      wrap
                      value={slot.relation}
                      onChange={(relation) => patchSlot(i, { relation })}
                      options={(['before', 'with', 'after'] as const).map((r) => ({ value: r, label: S.relation[r] }))}
                    />
                  ) : null}
                  {slot.relation !== 'with' && slot.meal !== 'bedtime' ? (
                    <Field label={S.offset}>
                      <Input value={slot.offset} onChangeText={(offset) => patchSlot(i, { offset })} keyboardType="number-pad" />
                    </Field>
                  ) : null}
                </>
              ) : (
                <Field label={S.clockTime}>
                  <Input value={slot.time} onChangeText={(time) => patchSlot(i, { time })} keyboardType="numbers-and-punctuation" />
                </Field>
              )}

              {!draft.taperOn ? (
                <Field label={S.amount}>
                  <Input value={slot.amount} onChangeText={(amount) => patchSlot(i, { amount })} keyboardType="decimal-pad" />
                </Field>
              ) : null}
            </Card>
          ))}
          <Button label={S.addTime} variant="secondary" onPress={() => patch({ slots: [...draft.slots, newSlot()] })} />
        </Field>
      ) : null}

      <Field label={S.startDate} error={errors.startDate}>
        <Input value={draft.startDate} onChangeText={(startDate) => patch({ startDate })} keyboardType="numbers-and-punctuation" />
      </Field>

      {draft.frequency !== 'asNeeded' ? (
        <Card>
          <ToggleRow label={S.taper} value={draft.taperOn} onValueChange={(taperOn) => patch({ taperOn })} />
          {draft.taperOn ? (
            <>
              <AppText variant="caption" tone="muted">
                {S.taperHint}
              </AppText>
              {draft.taper.map((step, i) => (
                <View key={i} style={styles.taperRow}>
                  <AppText variant="bodyStrong" style={styles.taperLabel}>
                    {S.taperStep(i)}
                  </AppText>
                  <View style={styles.flex}>
                    <Input
                      value={step.amount}
                      onChangeText={(amount) => patch({ taper: draft.taper.map((s, j) => (j === i ? { ...s, amount } : s)) })}
                      keyboardType="decimal-pad"
                      placeholder={S.taperAmount}
                      accessibilityLabel={`${S.taperStep(i)} ${S.taperAmount}`}
                    />
                  </View>
                  <View style={styles.flex}>
                    <Input
                      value={step.days}
                      onChangeText={(days) => patch({ taper: draft.taper.map((s, j) => (j === i ? { ...s, days } : s)) })}
                      keyboardType="number-pad"
                      placeholder={S.taperDays}
                      accessibilityLabel={`${S.taperStep(i)} ${S.taperDays}`}
                    />
                  </View>
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={strings.common.remove}
                    hitSlop={8}
                    onPress={() => patch({ taper: draft.taper.filter((_, j) => j !== i) })}
                  >
                    <Ionicons name="close-circle-outline" size={22} color={colors.textMuted} />
                  </Pressable>
                </View>
              ))}
              {errors.taper ? (
                <AppText variant="caption" tone="danger">
                  {errors.taper}
                </AppText>
              ) : null}
              <Button
                label={S.addTaperStep}
                variant="secondary"
                onPress={() => patch({ taper: [...draft.taper, { amount: '1', days: '5' }] })}
              />
            </>
          ) : (
            <Field label={S.duration} hint={S.durationHint} error={errors.duration}>
              <Input value={draft.durationDays} onChangeText={(durationDays) => patch({ durationDays })} keyboardType="number-pad" />
            </Field>
          )}
        </Card>
      ) : null}

      <Card>
        <AppText variant="label" tone="muted">
          {S.stock}
        </AppText>
        <ChipGroup
          value={stockMode}
          onChange={setStockMode}
          options={[
            { value: 'none', label: S.stockNone },
            { value: 'new', label: S.stockNew },
            ...(stockList.length ? [{ value: 'existing' as const, label: S.stockExisting }] : []),
          ]}
        />
        {stockMode === 'new' ? (
          <>
            <Field label={S.stockQuantity}>
              <Input value={stockQty} onChangeText={setStockQty} keyboardType="decimal-pad" />
            </Field>
            <Field label={S.stockThreshold}>
              <Input value={stockThreshold} onChangeText={setStockThreshold} keyboardType="number-pad" />
            </Field>
          </>
        ) : null}
        {stockMode === 'existing' ? (
          <Field label={S.stockExisting} hint={S.stockShareHint} error={errors.stock}>
            <ChipGroup
              value={stockId}
              onChange={setStockId}
              options={stockList.map((s) => ({
                value: s.id,
                label: `${s.name}${s.strength ? ` ${s.strength}` : ''} · ${s.quantity} left`,
              }))}
            />
          </Field>
        ) : null}
      </Card>

      <Field label={S.notes}>
        <Input value={notes} onChangeText={setNotes} multiline />
      </Field>

      <Button label={strings.common.save} onPress={save} />
      {params.id ? <Button label={strings.common.delete} variant="ghost" onPress={remove} /> : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  slotHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.sm },
  taperRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  taperLabel: { width: 56 },
  flex: { flex: 1 },
});
