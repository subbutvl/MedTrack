import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { Alert, Linking, Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppText } from '@/components/AppText';
import { Card } from '@/components/Card';
import { CheckupCalendar } from '@/components/CheckupCalendar';
import { CheckupRow } from '@/components/CheckupRow';
import { CopySearchButton } from '@/components/CopySearchButton';
import { EmptyState } from '@/components/EmptyState';
import { HealthLog } from '@/components/HealthLog';
import { Screen } from '@/components/Screen';
import { getGlobalMealTimes, listCheckups, listDoctors, listMedications, markVisited, type Checkup } from '@/db/repo';
import { localToday } from '@/domain/dates';
import { groupByTimeOfDay } from '@/domain/medicineGroups';
import { formatMinute } from '@/domain/timeline';
import { DEFAULT_MEAL_TIMES } from '@/domain/types';
import { describeSchedule } from '@/domain/describe';
import type { ReadingType } from '@/domain/readings';
import { useData } from '@/hooks/useData';
import { strings } from '@/i18n/strings';
import { displayName, useActivePerson } from '@/state/ActivePerson';
import { radius, spacing, useTheme } from '@/theme';

type Segment = 'medicines' | 'checkups' | 'doctors' | 'health';
const SEGMENTS: Segment[] = ['medicines', 'checkups', 'doctors', 'health'];
const M = strings.medications;

async function load(personId: string) {
  const [meds, global, checkups, doctors, allDoctors] = await Promise.all([
    listMedications(personId),
    getGlobalMealTimes(),
    listCheckups(personId),
    listDoctors(personId),
    listDoctors(),
  ]);
  return { personId, meds, global, checkups, doctors, doctorName: new Map(allDoctors.map((d) => [d.id, d.name])) };
}

export default function MedicationsScreen() {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const { person } = useActivePerson();
  const params = useLocalSearchParams<{ segment?: Segment }>();
  const [segment, setSegment] = useState<Segment>(params.segment ?? 'medicines');
  const [readingType, setReadingType] = useState<ReadingType>('bp');
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

  // Records today's visit, moves the checkup to its next date and re-plans the reminders.
  const confirmVisited = (c: Checkup) =>
    Alert.alert(strings.checkups.visitedConfirm(c.title), strings.checkups.visitedConfirmBody, [
      { text: strings.common.cancel, style: 'cancel' },
      {
        text: strings.checkups.markVisited,
        onPress: async () => {
          const next = await markVisited(c.id, localToday());
          Alert.alert(next ? strings.checkups.visitedNext(next) : strings.checkups.visitedNoNext);
        },
      },
    ]);

  const add = () => {
    if (!personId) return;
    if (segment === 'medicines') router.push({ pathname: '/medication/edit', params: { personId } });
    else if (segment === 'checkups') router.push({ pathname: '/checkup/edit', params: { personId } });
    else if (segment === 'doctors') router.push({ pathname: '/doctor/edit', params: { personId } });
    else router.push({ pathname: '/health/add', params: { personId, type: readingType } });
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
                    <AppText variant="bodyStrong" tone={selected ? 'onPrimary' : 'primary'} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.8}>
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
            <>
              {groupByTimeOfDay(data.meds, () => meals ?? DEFAULT_MEAL_TIMES).map(({ group, items }) => (
                <View key={group} style={styles.section}>
                  <AppText variant="label" tone="muted">
                    {M.groups[group]}
                  </AppText>
                  {items.map(({ med: m, minute }) => {
                    const doctor = m.doctorId ? data.doctorName.get(m.doctorId) : undefined;
                    return (
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
                              {minute != null ? `${formatMinute(minute)} · ` : ''}
                              {describeSchedule(m.schedule, meals)}
                            </AppText>
                          ) : null}
                          {doctor ? (
                            <View style={styles.doctorLine}>
                              <Ionicons name="person-outline" size={13} color={colors.textMuted} />
                              <AppText variant="caption" tone="muted" numberOfLines={1} style={styles.flex}>
                                {doctor}
                              </AppText>
                            </View>
                          ) : null}
                        </View>
                        <CopySearchButton name={m.strength ? `${m.name} ${m.strength}` : m.name} iconOnly />
                        <Ionicons name="chevron-forward" size={20} color={colors.textMuted} />
                      </Pressable>
                    );
                  })}
                </View>
              ))}
            </>
          )
        ) : null}

        {data && segment === 'checkups' ? (
          data.checkups.length === 0 ? (
            <EmptyState icon="calendar-outline" title={M.emptyCheckups} body={M.emptyCheckupsBody} />
          ) : (
            <>
              <CheckupCalendar personId={personId} checkups={data.checkups} />
              <AppText variant="title" style={styles.listTitle}>
                {strings.calendar.yourCheckups}
              </AppText>
              {data.checkups.map((c) => (
                <CheckupRow
                  key={c.id}
                  checkup={c}
                  today={today}
                  onPress={() => router.push({ pathname: '/checkup/edit', params: { id: c.id } })}
                  onVisited={() => confirmVisited(c)}
                />
              ))}
            </>
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

        {personId && segment === 'health' ? <HealthLog personId={personId} type={readingType} onTypeChange={setReadingType} /> : null}
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
  section: { gap: spacing.sm },
  listTitle: { marginTop: spacing.md },
  doctorLine: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs, marginTop: 2 },
  call: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs, alignSelf: 'flex-start' },
  fab: {
    position: 'absolute',
    width: 60,
    height: 60,
    borderRadius: 30,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 6,
    shadowColor: '#0A2540',
    shadowOpacity: 0.25,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
  },
});
