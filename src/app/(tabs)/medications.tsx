import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { Linking, Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppText } from '@/components/AppText';
import { Card } from '@/components/Card';
import { CheckupRow } from '@/components/CheckupRow';
import { CopySearchButton } from '@/components/CopySearchButton';
import { EmptyState } from '@/components/EmptyState';
import { Screen } from '@/components/Screen';
import { getGlobalMealTimes, listCheckups, listDoctors, listMedications } from '@/db/repo';
import { localToday } from '@/domain/dates';
import { describeSchedule } from '@/domain/describe';
import { useData } from '@/hooks/useData';
import { strings } from '@/i18n/strings';
import { displayName, useActivePerson } from '@/state/ActivePerson';
import { radius, spacing, useTheme } from '@/theme';

type Segment = 'medicines' | 'checkups' | 'doctors';
const SEGMENTS: Segment[] = ['medicines', 'checkups', 'doctors'];
const M = strings.medications;

async function load(personId: string) {
  const [meds, global, checkups, doctors] = await Promise.all([
    listMedications(personId),
    getGlobalMealTimes(),
    listCheckups(personId),
    listDoctors(personId),
  ]);
  return { personId, meds, global, checkups, doctors };
}

export default function MedicationsScreen() {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const { person } = useActivePerson();
  const params = useLocalSearchParams<{ segment?: Segment }>();
  const [segment, setSegment] = useState<Segment>(params.segment ?? 'medicines');
  // A link that names a segment (such as Today's "Add a medicine") opens that segment.
  useEffect(() => {
    if (params.segment && SEGMENTS.includes(params.segment)) {
      setSegment(params.segment);
      // Clear it so the same link works again after the user switches segments.
      router.setParams({ segment: undefined });
    }
  }, [params.segment]);
  const personId = person?.id ?? '';
  const { data: loaded } = useData(() => (personId ? load(personId) : Promise.resolve(undefined)), [personId]);
  // While a newly chosen profile loads, show nothing rather than the previous person's lists.
  const data = loaded && loaded.personId === personId ? loaded : undefined;
  const meals = person?.mealTimes ?? data?.global;
  const today = localToday();

  const add = () => {
    if (!personId) return;
    if (segment === 'medicines') router.push({ pathname: '/medication/edit', params: { personId } });
    else if (segment === 'checkups') router.push({ pathname: '/checkup/edit', params: { personId } });
    else router.push({ pathname: '/doctor/edit', params: { personId } });
  };

  return (
    <View style={styles.flex}>
      <Screen
        // Room at the bottom so the floating button never covers the last item.
        contentStyle={{ paddingBottom: 96 }}
        header={
          <>
            <AppText variant="display">{M.title}</AppText>
            {person ? (
              <AppText tone="muted">
                {strings.people.viewing} {displayName(person)}
              </AppText>
            ) : null}
            <View style={[styles.segment, { backgroundColor: colors.surfaceAlt }]} accessibilityRole="tablist">
              {SEGMENTS.map((s) => {
                const selected = s === segment;
                return (
                  <Pressable
                    key={s}
                    accessibilityRole="tab"
                    accessibilityState={{ selected }}
                    onPress={() => setSegment(s)}
                    style={[styles.segmentOption, selected && { backgroundColor: colors.primary }]}
                  >
                    <AppText variant="bodyStrong" tone={selected ? 'onPrimary' : 'primary'} numberOfLines={1}>
                      {M.segments[s]}
                    </AppText>
                  </Pressable>
                );
              })}
            </View>
          </>
        }
      >
        {data && segment === 'medicines' ? (
          data.meds.length === 0 ? (
            <EmptyState icon="medkit-outline" title={M.emptyMedicines} body={M.emptyMedicinesBody} />
          ) : (
            data.meds.map((m) => (
              <Pressable
                key={m.id}
                accessibilityRole="button"
                onPress={() => router.push({ pathname: '/medication/edit', params: { id: m.id } })}
                style={({ pressed }) => [styles.row, { backgroundColor: colors.surface, borderColor: colors.border, opacity: pressed ? 0.85 : 1 }]}
              >
                <View style={styles.flex}>
                  <AppText variant="heading">
                    {m.name}
                    {m.strength ? <AppText tone="muted"> {m.strength}</AppText> : null}
                  </AppText>
                  {meals ? (
                    <AppText variant="caption" tone="muted">
                      {describeSchedule(m.schedule, meals)}
                    </AppText>
                  ) : null}
                  <View style={{ marginTop: spacing.sm }}>
                    <CopySearchButton name={m.strength ? `${m.name} ${m.strength}` : m.name} />
                  </View>
                </View>
                <Ionicons name="chevron-forward" size={20} color={colors.textMuted} />
              </Pressable>
            ))
          )
        ) : null}

        {data && segment === 'checkups' ? (
          data.checkups.length === 0 ? (
            <EmptyState icon="calendar-outline" title={M.emptyCheckups} body={M.emptyCheckupsBody} />
          ) : (
            data.checkups.map((c) => (
              <CheckupRow key={c.id} checkup={c} today={today} onPress={() => router.push({ pathname: '/checkup/edit', params: { id: c.id } })} />
            ))
          )
        ) : null}

        {data && segment === 'doctors' ? (
          data.doctors.length === 0 ? (
            <EmptyState icon="person-outline" title={M.emptyDoctors} body={M.emptyDoctorsBody} />
          ) : (
            data.doctors.map((d) => (
              <Card key={d.id}>
                <Pressable accessibilityRole="button" onPress={() => router.push({ pathname: '/doctor/edit', params: { id: d.id, personId } })}>
                  <AppText variant="heading">{d.name}</AppText>
                  <AppText variant="caption" tone="muted">
                    {[d.specialty, d.clinic].filter(Boolean).join(' · ') || ' '}
                  </AppText>
                </Pressable>
                {d.phone ? (
                  <Pressable accessibilityRole="button" onPress={() => Linking.openURL(`tel:${d.phone}`)} style={styles.call} hitSlop={6}>
                    <Ionicons name="call-outline" size={16} color={colors.primary} />
                    <AppText variant="caption" tone="primary">
                      {strings.doctors.call} {d.phone}
                    </AppText>
                  </Pressable>
                ) : null}
              </Card>
            ))
          )
        ) : null}
      </Screen>

      <Pressable
        accessibilityRole="button"
        accessibilityLabel={M.add[segment]}
        onPress={add}
        style={({ pressed }) => [
          styles.fab,
          { backgroundColor: colors.primary, bottom: spacing.lg, right: spacing.lg + insets.right, opacity: pressed ? 0.85 : 1 },
        ]}
      >
        <Ionicons name="add" size={30} color={colors.onPrimary} />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  segment: { flexDirection: 'row', borderRadius: radius.md, padding: spacing.xs, gap: spacing.xs, marginTop: spacing.xs },
  segmentOption: { flex: 1, minHeight: 40, borderRadius: radius.sm, alignItems: 'center', justifyContent: 'center', paddingHorizontal: spacing.xs },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, padding: spacing.lg, borderRadius: radius.lg, borderWidth: StyleSheet.hairlineWidth },
  call: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs, alignSelf: 'flex-start' },
  fab: {
    position: 'absolute',
    width: 60,
    height: 60,
    borderRadius: 30,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 6,
    shadowColor: '#021229',
    shadowOpacity: 0.25,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
  },
});
