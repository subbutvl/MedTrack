import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { Alert, Pressable, StyleSheet, View } from 'react-native';

import { AppText } from './AppText';
import { Button } from './Button';
import { Card } from './Card';
import { ChipGroup } from './Form';
import { deleteReading, deleteSideEffect, listMedications, listReadings, listSideEffects } from '@/db/repo';
import { flagReading, formatReading, primaryValue, READING_TYPES, type Flag, type ReadingType } from '@/domain/readings';
import { useData } from '@/hooks/useData';
import { strings } from '@/i18n/strings';
import { radius, spacing, useTheme } from '@/theme';

const H = strings.health;

async function load(personId: string, type: ReadingType) {
  const [readings, sideEffects, meds] = await Promise.all([
    listReadings(personId, type, 30),
    listSideEffects(personId, 20),
    listMedications(personId),
  ]);
  return { personId, type, readings, sideEffects, medName: new Map(meds.map((m) => [m.id, m.name])) };
}

const when = (ms: number) =>
  new Date(ms).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' });

/**
 * A person's health log: readings with a trend, and side effects. Shown as the Health section of
 * the Medications tab; the tab's + button adds a reading of the selected type.
 */
export function HealthLog({ personId, type, onTypeChange }: { personId: string; type: ReadingType; onTypeChange: (t: ReadingType) => void }) {
  const { colors } = useTheme();
  const { data: loaded } = useData(() => load(personId, type), [personId, type]);
  // Ignore data still loading for a previous profile or reading type.
  const data = loaded && loaded.personId === personId && loaded.type === type ? loaded : undefined;

  const flagColor = (f: Flag) => (f === 'high' ? colors.danger : f === 'low' ? colors.warning : colors.success);
  const confirmDelete = (fn: () => Promise<void>) =>
    Alert.alert(H.deleteConfirm, undefined, [
      { text: strings.common.cancel, style: 'cancel' },
      { text: strings.common.delete, style: 'destructive', onPress: () => void fn() },
    ]);

  const latest = data?.readings[0];
  // The trend shows the last 14 readings, oldest on the left, scaled to the visible range.
  const trend = (data?.readings.slice(0, 14) ?? []).reverse();
  const values = trend.map((r) => primaryValue(r.value));
  const min = Math.min(...values);
  const max = Math.max(...values);

  return (
    <>
      <ChipGroup value={type} onChange={onTypeChange} options={READING_TYPES.map((t) => ({ value: t, label: H.types[t] }))} />

      <Card>
        <AppText variant="label" tone="muted">
          {H.latest}
        </AppText>
        {latest ? (
          <>
            <View style={styles.row}>
              <AppText variant="title" style={styles.flex}>
                {formatReading(latest.value)}
              </AppText>
              <View style={[styles.flag, { backgroundColor: flagColor(flagReading(latest.value)) }]}>
                <AppText variant="caption" tone="onPrimary">
                  {H.flags[flagReading(latest.value)]}
                </AppText>
              </View>
            </View>
            <AppText variant="caption" tone="muted">
              {when(latest.takenAt)}
            </AppText>
          </>
        ) : (
          <AppText tone="muted">{H.none}</AppText>
        )}

        {trend.length > 1 ? (
          <View style={styles.chart} accessibilityLabel={`Trend of the last ${trend.length} readings`}>
            {trend.map((r, i) => {
              const h = max === min ? 0.5 : (values[i] - min) / (max - min);
              return (
                <View key={r.id} style={styles.barSlot}>
                  <View
                    style={[styles.bar, { height: `${20 + h * 80}%`, backgroundColor: flagColor(flagReading(r.value)) }]}
                  />
                </View>
              );
            })}
          </View>
        ) : null}
      </Card>

      <AppText variant="label" tone="muted">
        {H.recent}
      </AppText>
      {data?.readings.length === 0 ? <AppText tone="muted">{H.none}</AppText> : null}
      {data?.readings.slice(0, 10).map((r) => (
        <View key={r.id} style={[styles.entry, { borderColor: colors.border }]}>
          <View style={[styles.dot, { backgroundColor: flagColor(flagReading(r.value)) }]} />
          <View style={styles.flex}>
            <AppText>{formatReading(r.value)}</AppText>
            <AppText variant="caption" tone="muted">
              {when(r.takenAt)}
            </AppText>
          </View>
          <Pressable accessibilityRole="button" accessibilityLabel={strings.common.delete} hitSlop={8} onPress={() => confirmDelete(() => deleteReading(r.id))}>
            <Ionicons name="trash-outline" size={18} color={colors.textMuted} />
          </Pressable>
        </View>
      ))}

      <AppText variant="label" tone="muted">
        {H.sideEffects}
      </AppText>
      {data?.sideEffects.length === 0 ? <AppText tone="muted">{H.none}</AppText> : null}
      {data?.sideEffects.map((s) => (
        <View key={s.id} style={[styles.entry, { borderColor: colors.border }]}>
          <View style={styles.flex}>
            <AppText>{s.description}</AppText>
            <AppText variant="caption" tone={s.severity === 'severe' ? 'danger' : 'muted'}>
              {[H.severities[s.severity], s.medicationId ? data.medName.get(s.medicationId) : null, when(s.notedAt)].filter(Boolean).join(' · ')}
            </AppText>
          </View>
          <Pressable accessibilityRole="button" accessibilityLabel={strings.common.delete} hitSlop={8} onPress={() => confirmDelete(() => deleteSideEffect(s.id))}>
            <Ionicons name="trash-outline" size={18} color={colors.textMuted} />
          </Pressable>
        </View>
      ))}
      <Button label={`${strings.common.add} ${H.sideEffect.toLowerCase()}`} variant="secondary" onPress={() => router.push({ pathname: '/health/add', params: { personId, type: 'side_effect' } })} />

      <AppText variant="caption" tone="muted">
        {H.rangesNote}
      </AppText>
    </>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  flex: { flex: 1 },
  flag: { borderRadius: radius.pill, paddingHorizontal: spacing.sm, paddingVertical: 2 },
  chart: { flexDirection: 'row', alignItems: 'flex-end', height: 72, gap: 4, marginTop: spacing.sm },
  barSlot: { flex: 1, height: '100%', justifyContent: 'flex-end' },
  bar: { borderRadius: 3, minHeight: 4 },
  entry: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, paddingVertical: spacing.sm, borderBottomWidth: StyleSheet.hairlineWidth },
  dot: { width: 10, height: 10, borderRadius: 5 },
});
