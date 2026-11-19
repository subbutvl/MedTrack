import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useMemo } from 'react';
import { ActionSheetIOS, Alert, Platform, StyleSheet, View } from 'react-native';

import { AppText } from '@/components/AppText';
import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { DoseCard } from '@/components/DoseCard';
import { PersonSwitcher } from '@/components/PersonSwitcher';
import { EmptyState } from '@/components/EmptyState';
import { MedicineCalendar } from '@/components/MedicineCalendar';
import { Screen } from '@/components/Screen';
import { clearDose, getGlobalMealTimes, listDoseEvents, listMedications, listPeople, listStock, logDose, type DoseRef } from '@/db/repo';
import { localToday } from '@/domain/dates';
import { dailyUse } from '@/domain/schedule';
import { forecastStock } from '@/domain/stock';
import { buildTimeline, sectionFor, type TimelineItem } from '@/domain/timeline';
import { useData, useMinuteTick } from '@/hooks/useData';
import { strings } from '@/i18n/strings';
import { scheduleSnooze } from '@/services/reminders';
import { useActivePerson } from '@/state/ActivePerson';
import { radius, spacing, useTheme } from '@/theme';

const SNOOZE_OPTIONS = [10, 30, 60];

async function loadToday(date: string, personId: string | undefined) {
  const [people, meds, events, stock, globalMeals] = await Promise.all([
    listPeople(),
    listMedications(),
    listDoseEvents(date),
    listStock(),
    getGlobalMealTimes(),
  ]);
  const people_ = new Map(people.map((p) => [p.id, p]));
  const timelineMeds = meds
    .filter((m) => m.active && people_.has(m.personId) && m.personId === personId)
    .map((m) => ({
      id: m.id,
      personId: m.personId,
      name: m.name,
      strength: m.strength,
      schedule: m.schedule,
      meals: people_.get(m.personId)?.mealTimes ?? globalMeals,
    }));

  // Refill warnings: sum daily use across every medicine sharing a stock item, and show the
  // warning to whoever's medicines draw from it.
  const lowStock = stock
    .filter((s) => meds.some((m) => m.stockItemId === s.id && m.personId === personId))
    .map((s) => {
      const usesAll = meds
        .filter((m) => m.active && m.stockItemId === s.id && people_.has(m.personId))
        .map((m) => dailyUse(m.schedule, date, people_.get(m.personId)?.mealTimes ?? globalMeals));
      return { stock: s, ...forecastStock(s.quantity, usesAll, s.thresholdDays) };
    })
    .filter((x) => x.low);

  return { personId, people: people_, timelineMeds, events, lowStock };
}

export default function TodayScreen() {
  const { colors } = useTheme();
  const now = useMinuteTick();
  const date = localToday(now);
  const nowMinute = now.getHours() * 60 + now.getMinutes();
  const { person } = useActivePerson();
  const { data: loaded } = useData(() => loadToday(date, person?.id), [date, person?.id]);
  // While a newly chosen profile loads, show nothing rather than the previous person's doses.
  const data = loaded && loaded.personId === person?.id ? loaded : undefined;

  const timeline = useMemo(
    () => (data ? buildTimeline(data.timelineMeds, data.events, date, nowMinute) : []),
    [data, date, nowMinute],
  );
  const done = timeline.filter((t) => t.status === 'taken' || t.status === 'skipped').length;

  const sections = useMemo(() => {
    const groups = new Map<ReturnType<typeof sectionFor>, TimelineItem[]>();
    for (const item of timeline) {
      const k = sectionFor(item.minute);
      groups.set(k, [...(groups.get(k) ?? []), item]);
    }
    return [...groups.entries()];
  }, [timeline]);

  const refOf = (i: TimelineItem): DoseRef => ({ medicationId: i.medicationId, date: i.date, minute: i.minute, slotIndex: i.slotIndex, amount: i.amount });

  const snooze = (item: TimelineItem) => {
    const apply = async (minutes: number) => {
      await logDose(refOf(item), 'snoozed', { snoozedUntilMinute: nowMinute + minutes });
      await scheduleSnooze(item.medicationId, item.date, item.slotIndex, minutes);
    };
    const labels = SNOOZE_OPTIONS.map((m) => `${m} minutes`);
    if (Platform.OS === 'ios') {
      ActionSheetIOS.showActionSheetWithOptions(
        { title: strings.today.snoozeTitle, options: [...labels, strings.common.cancel], cancelButtonIndex: labels.length },
        (i) => i < labels.length && void apply(SNOOZE_OPTIONS[i]),
      );
    } else {
      Alert.alert(strings.today.snoozeTitle, undefined, [
        ...SNOOZE_OPTIONS.map((m, i) => ({ text: labels[i], onPress: () => void apply(m) })),
        { text: strings.common.cancel, style: 'cancel' as const },
      ]);
    }
  };

  const heading = now.toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long' });

  return (
    <Screen
      header={
        <>
          <PersonSwitcher />
          <View>
            <AppText variant="label" tone="muted">
              {heading}
            </AppText>
            <AppText variant="display">{strings.today.title}</AppText>
            {timeline.length > 0 ? (
              <AppText tone="muted">{done === timeline.length ? strings.today.allDone : strings.today.progress(done, timeline.length)}</AppText>
            ) : null}
          </View>
          {timeline.length > 0 ? (
            <View style={[styles.progressTrack, { backgroundColor: colors.surfaceAlt }]}>
              <View style={[styles.progressFill, { backgroundColor: colors.accent, width: `${(done / timeline.length) * 100}%` }]} />
            </View>
          ) : null}
          {data && person && data.timelineMeds.length > 0 ? <MedicineCalendar personId={person.id} meds={data.timelineMeds} /> : null}
        </>
      }
    >
      {data?.lowStock.map(({ stock, daysLeft }) => (
        <Card key={stock.id} style={{ borderColor: colors.warning }}>
          <View style={styles.row}>
            <Ionicons name="warning-outline" size={20} color={colors.warning} />
            <AppText tone="warning" style={styles.flex}>
              {strings.today.lowStock(stock.name, daysLeft)}
            </AppText>
          </View>
        </Card>
      ))}

      {data && timeline.length === 0 ? (
        <>
          <EmptyState icon="medkit-outline" title={strings.today.emptyTitle} body={strings.today.emptyBody} />
          <Button label={strings.today.addMedicine} onPress={() => router.navigate({ pathname: '/medications', params: { segment: 'medicines' } })} />
        </>
      ) : null}

      {sections.map(([section, items]) => (
        <View key={section} style={styles.section}>
          <AppText variant="label" tone="muted">
            {strings.today.sections[section]}
          </AppText>
          {items.map((item) => (
            <DoseCard
              key={item.key}
              item={item}
              onTaken={() => void logDose(refOf(item), 'taken')}
              onSkip={() => void logDose(refOf(item), 'skipped')}
              onSnooze={() => snooze(item)}
              onUndo={() => void clearDose(refOf(item))}
            />
          ))}
        </View>
      ))}
    </Screen>
  );
}

const styles = StyleSheet.create({
  section: { gap: spacing.sm },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  flex: { flex: 1 },
  progressTrack: { height: 6, borderRadius: radius.pill, overflow: 'hidden' },
  progressFill: { height: 6, borderRadius: radius.pill },
});
