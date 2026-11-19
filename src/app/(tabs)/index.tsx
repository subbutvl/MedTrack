import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useMemo, useRef } from 'react';
import { ActionSheetIOS, Alert, Platform, Pressable, StyleSheet, View } from 'react-native';

import { AppText } from '@/components/AppText';
import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { DoseCard, type DoseDetails } from '@/components/DoseCard';
import { PersonSwitcher } from '@/components/PersonSwitcher';
import { EmptyState } from '@/components/EmptyState';
import { MedicineCalendar, type MedicineCalendarHandle } from '@/components/MedicineCalendar';
import { Screen } from '@/components/Screen';
import { clearDose, getGlobalMealTimes, listDoctors, listDoseEvents, listMedications, listPeople, listStock, logDose, type DoseRef } from '@/db/repo';
import { slotRelation } from '@/domain/describe';
import { localToday } from '@/domain/dates';
import { dailyUse } from '@/domain/schedule';
import { forecastStock } from '@/domain/stock';
import { buildTimeline, formatMinute, sectionFor, type TimelineItem } from '@/domain/timeline';
import { useData, useMinuteTick } from '@/hooks/useData';
import { strings } from '@/i18n/strings';
import { scheduleSnooze } from '@/services/reminders';
import { useActivePerson } from '@/state/ActivePerson';
import { radius, spacing, useTheme } from '@/theme';

const SNOOZE_OPTIONS = [10, 30, 60];

async function loadToday(date: string, personId: string | undefined) {
  const [people, meds, events, stock, globalMeals, doctors] = await Promise.all([
    listPeople(),
    listMedications(),
    listDoseEvents(date),
    listStock(),
    getGlobalMealTimes(),
    listDoctors(),
  ]);
  const doctorName = new Map(doctors.map((d) => [d.id, d.name]));
  // What each dose card shows besides the timeline: the form, the doctor and the meal relation.
  const medInfo = new Map(
    meds.map((m) => [m.id, { form: m.form, doctor: m.doctorId ? doctorName.get(m.doctorId) ?? null : null, slots: m.schedule.slots }]),
  );
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

  return { personId, people: people_, timelineMeds, events, lowStock, medInfo };
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

  const snoozeFor = async (item: TimelineItem, minutes: number) => {
    await logDose(refOf(item), 'snoozed', { snoozedUntilMinute: nowMinute + minutes });
    await scheduleSnooze(item.medicationId, item.date, item.slotIndex, minutes);
  };

  const snooze = (item: TimelineItem) => {
    const apply = (minutes: number) => snoozeFor(item, minutes);
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

  const taken = timeline.filter((t) => t.status === 'taken').length;
  // The soonest dose still to take today gets the larger "Next up" card.
  const nextUp = timeline.find((t) => t.status !== 'taken' && t.status !== 'skipped' && t.status !== 'missed');
  const calendar = useRef<MedicineCalendarHandle>(null);

  const title = `${strings.today.title}, ${now.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}`;
  const weekdayName = now.toLocaleDateString('en-IN', { weekday: 'long' });

  const detailsFor = (item: TimelineItem): DoseDetails => {
    const info = data?.medInfo.get(item.medicationId);
    return { form: info?.form, doctor: info?.doctor, when: slotRelation(info?.slots[item.slotIndex]) };
  };

  return (
    <Screen
      header={
        <>
          <View style={styles.topRow}>
            <View style={styles.shrink}>
              <PersonSwitcher />
            </View>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={strings.today.openCalendar}
              onPress={() => calendar.current?.openMonth()}
              hitSlop={6}
              style={({ pressed }) => [styles.roundButton, { backgroundColor: colors.surface, borderColor: colors.border, opacity: pressed ? 0.7 : 1 }]}
            >
              <Ionicons name="calendar-outline" size={22} color={colors.primary} />
            </Pressable>
          </View>
          <View style={styles.titleRow}>
            <View style={styles.flex}>
              <AppText variant="display" style={styles.title} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.8}>
                {title}
              </AppText>
              <AppText tone="muted">{weekdayName}</AppText>
            </View>
            {timeline.length > 0 ? (
              <View style={[styles.takenPill, { backgroundColor: colors.successSoft, borderColor: colors.success }]}>
                <View style={[styles.dot, { backgroundColor: colors.success }]} />
                <AppText variant="caption" tone="success" style={styles.bold}>
                  {strings.today.takenPill(taken, timeline.length)}
                </AppText>
              </View>
            ) : null}
          </View>
          {data && person ? (
            <MedicineCalendar ref={calendar} personId={person.id} meds={data.timelineMeds} todayDone={done} todayTotal={timeline.length} />
          ) : null}
        </>
      }
    >
      {data?.lowStock.map(({ stock, daysLeft }) => (
        <Card key={stock.id} style={{ borderColor: colors.warning, backgroundColor: colors.warningSoft }}>
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

      {sections.map(([section, items]) => {
        const sectionDone = items.filter((i) => i.status === 'taken' || i.status === 'skipped').length;
        const pending = items.length - sectionDone;
        const complete = pending === 0;
        const icon = SECTION_ICON[section];
        return (
          <View key={section} style={styles.section}>
            <View style={styles.sectionHeader}>
              <View style={[styles.sectionIcon, { backgroundColor: section === 'morning' ? colors.warningSoft : colors.accentSoft }]}>
                <Ionicons name={icon} size={16} color={section === 'morning' ? colors.warning : colors.accent} />
              </View>
              <AppText variant="label" style={[styles.sectionLabel, { color: colors.text }]}>
                {strings.today.sections[section].toUpperCase()}
              </AppText>
              <AppText variant="caption" tone="muted" style={styles.flex} numberOfLines={1}>
                •  {formatMinute(items[0].minute)}
              </AppText>
              <View style={[styles.sectionPill, { backgroundColor: complete ? colors.successSoft : colors.warningSoft }]}>
                {!complete ? <View style={[styles.dot, { backgroundColor: colors.warning }]} /> : null}
                <AppText variant="caption" style={[styles.bold, { color: complete ? colors.success : colors.warning }]}>
                  {complete ? strings.today.sectionDone(sectionDone, items.length) : strings.today.sectionPending(pending)}
                </AppText>
              </View>
            </View>
            {items.map((item) => (
              <DoseCard
                key={item.key}
                item={item}
                details={detailsFor(item)}
                nextUp={item.key === nextUp?.key}
                onTaken={() => void logDose(refOf(item), 'taken')}
                onSkip={() => void logDose(refOf(item), 'skipped')}
                onSnooze={() => snooze(item)}
                onSnoozeFor={(m) => void snoozeFor(item, m)}
                onUndo={() => void clearDose(refOf(item))}
              />
            ))}
          </View>
        );
      })}
    </Screen>
  );
}

const SECTION_ICON = {
  morning: 'sunny-outline',
  afternoon: 'partly-sunny-outline',
  evening: 'moon-outline',
  night: 'bed-outline',
} as const;

const styles = StyleSheet.create({
  topRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, justifyContent: 'space-between' },
  shrink: { flexShrink: 1 },
  roundButton: { width: 44, height: 44, borderRadius: 22, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  title: { fontSize: 28, lineHeight: 34 },
  takenPill: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: spacing.md, paddingVertical: 6, borderRadius: radius.pill, borderWidth: 1 },
  dot: { width: 7, height: 7, borderRadius: 4 },
  bold: { fontWeight: '700' },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginTop: spacing.xs },
  sectionIcon: { width: 26, height: 26, borderRadius: radius.sm, alignItems: 'center', justifyContent: 'center' },
  sectionLabel: { letterSpacing: 0.8 },
  sectionPill: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: spacing.sm, paddingVertical: 3, borderRadius: radius.sm },
  section: { gap: spacing.md },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  flex: { flex: 1 },
});
