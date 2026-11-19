import { Ionicons } from '@expo/vector-icons';
import { forwardRef, useImperativeHandle, useMemo, useState } from 'react';
import { Pressable } from 'react-native';
import { StyleSheet, View } from 'react-native';

import { listDoseEventsBetween } from '@/db/repo';
import { dayProgress, dosesOn, monthGridRange, weekOf } from '@/domain/calendar';
import { formatMinute, type DoseStatus, type TimelineItem, type TimelineMedication } from '@/domain/timeline';
import type { ISODate } from '@/domain/types';
import { useData, useMinuteTick } from '@/hooks/useData';
import { localToday } from '@/domain/dates';
import { strings } from '@/i18n/strings';
import { radius, spacing, useTheme } from '@/theme';
import { AppText } from './AppText';
import { formatDay, LegendItem, MonthCalendar, ProgressRing, type DayMark } from './Calendar';

const C = strings.calendar;

const STATUS_ICON: Record<DoseStatus, keyof typeof Ionicons.glyphMap> = {
  taken: 'checkmark-circle',
  skipped: 'remove-circle-outline',
  missed: 'close-circle-outline',
  pending: 'time-outline',
  due: 'alarm-outline',
  overdue: 'alert-circle-outline',
  snoozed: 'moon-outline',
};

export type MedicineCalendarHandle = { openMonth: () => void };

/**
 * This week's doses in a card, in the style of Apple Health: a circle per day that turns into a
 * green check when every dose was taken, today ringed, then today's progress. Tapping a day, or
 * calling openMonth, opens the full month with that day's doses.
 */
export const MedicineCalendar = forwardRef<
  MedicineCalendarHandle,
  { personId: string; meds: TimelineMedication[]; todayDone: number; todayTotal: number }
>(function MedicineCalendar({ personId, meds: timelineMeds, todayDone, todayTotal }, ref) {
  const { colors } = useTheme();
  const now = useMinuteTick();
  const today = localToday(now);
  const nowMinute = now.getHours() * 60 + now.getMinutes();
  const [selected, setSelected] = useState<ISODate>(today);
  const [month, setMonth] = useState<ISODate | null>(null);
  useImperativeHandle(ref, () => ({ openMonth: () => setMonth(selected) }), [selected]);

  // Load the log for the visible week, plus the visible month while it is open.
  const week = weekOf(today);
  const grid = month ? monthGridRange(month) : null;
  const from = grid && grid.from < week[0] ? grid.from : week[0];
  const to = grid && grid.to > week[6] ? grid.to : week[6];
  const { data: events } = useData(() => listDoseEventsBetween(from, to), [from, to, personId]);

  const dayCache = useMemo(() => new Map<ISODate, TimelineItem[]>(), [timelineMeds, events, today, nowMinute]);
  const itemsOn = (d: ISODate) => {
    let items = dayCache.get(d);
    if (!items) dayCache.set(d, (items = dosesOn(timelineMeds, events ?? [], d, today, nowMinute)));
    return items;
  };

  const status = (s: DoseStatus) =>
    s === 'taken' ? colors.success : s === 'missed' || s === 'overdue' ? colors.danger : s === 'skipped' ? colors.warning : colors.textMuted;

  const markFor = (d: ISODate): DayMark | undefined => {
    const p = dayProgress(itemsOn(d));
    if (p.planned === 0) return undefined;
    const complete = p.taken === p.planned;
    return {
      progress: d > today ? 0 : p.taken / p.planned,
      ringColor: complete ? colors.success : colors.accent,
      dots: d < today && p.missed > 0 ? [colors.danger] : undefined,
      label: C.dosesTaken(p.taken, p.planned),
    };
  };

  const detail = (d: ISODate) => {
    const items = itemsOn(d);
    const p = dayProgress(items);
    return (
      <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <View style={styles.cardHeader}>
          <AppText variant="heading" style={styles.flex}>
            {d === today ? C.today : formatDay(d)}
          </AppText>
          {p.planned ? (
            <AppText variant="label" tone={p.taken === p.planned ? 'success' : 'muted'}>
              {C.dosesTaken(p.taken, p.planned)}
            </AppText>
          ) : null}
        </View>
        {items.length === 0 ? (
          <AppText tone="muted">{C.noDoses}</AppText>
        ) : (
          items.map((i) => (
            <View key={i.key} style={styles.doseRow}>
              <AppText variant="label" tone="muted" style={styles.time}>
                {formatMinute(i.minute)}
              </AppText>
              <AppText style={styles.flex} numberOfLines={1}>
                {i.name}
                {i.strength ? <AppText tone="muted"> {i.strength}</AppText> : null}
              </AppText>
              <View style={styles.status}>
                <Ionicons name={STATUS_ICON[i.status]} size={16} color={status(i.status)} />
                <AppText variant="caption" style={{ color: status(i.status) }}>
                  {strings.today.status[i.status]}
                </AppText>
              </View>
            </View>
          ))
        )}
      </View>
    );
  };

  return (
    <View>
      <View style={[styles.weekCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <View style={styles.weekRow}>
          {week.map((d, i) => (
            <WeekDay
              key={d}
              date={d}
              letter={C.weekdays[i]}
              today={today}
              progress={dayProgress(itemsOn(d))}
              onPress={() => {
                setSelected(d);
                setMonth(d);
              }}
            />
          ))}
        </View>
        {todayTotal > 0 ? (
          <>
            <View style={[styles.divider, { backgroundColor: colors.border }]} />
            <View style={styles.progressRow}>
              <View style={[styles.dot, { backgroundColor: todayDone === todayTotal ? colors.success : colors.accent }]} />
              <AppText variant="bodyStrong" style={styles.flex} numberOfLines={1}>
                {C.remaining(todayTotal - todayDone)}
              </AppText>
              <AppText variant="bodyStrong">{C.percentDone(Math.round((todayDone / todayTotal) * 100))}</AppText>
            </View>
            <View style={[styles.track, { backgroundColor: colors.surfaceAlt }]}>
              <View
                style={[
                  styles.fill,
                  { backgroundColor: todayDone === todayTotal ? colors.success : colors.accent, width: `${(todayDone / todayTotal) * 100}%` },
                ]}
              />
            </View>
          </>
        ) : null}
      </View>
      <MonthCalendar
        visible={month != null}
        month={month ?? selected}
        selected={selected}
        today={today}
        markFor={markFor}
        onMonthChange={setMonth}
        onSelect={setSelected}
        onClose={() => setMonth(null)}
        footer={
          <>
            <View style={styles.legend}>
              <LegendItem ring color={colors.accent} label={C.legendTaken} />
              <LegendItem color={colors.danger} label={strings.today.status.missed} />
            </View>
            {detail(selected)}
          </>
        }
      />
    </View>
  );
});

/** One day of the week card: the letter, a circle showing how the day went, then the date. */
function WeekDay({
  date,
  letter,
  today,
  progress: p,
  onPress,
}: {
  date: ISODate;
  letter: string;
  today: ISODate;
  progress: ReturnType<typeof dayProgress>;
  onPress: () => void;
}) {
  const { colors } = useTheme();
  const isToday = date === today;
  const future = date > today;
  const complete = p.planned > 0 && p.taken === p.planned && !future;
  const day = String(Number(date.slice(8)));
  const size = 40;

  let circle;
  if (complete) {
    circle = (
      <View style={[styles.circle, { width: size, height: size, backgroundColor: colors.success }]}>
        <Ionicons name="checkmark" size={20} color="#FFFFFF" />
      </View>
    );
  } else if (isToday) {
    circle = (
      <View style={[styles.circle, { width: size, height: size, backgroundColor: colors.primary }]}>
        <AppText variant="bodyStrong" tone="onPrimary">
          {day}
        </AppText>
      </View>
    );
  } else if (!future && p.planned > 0) {
    // A past day with doses not all taken: a partial ring.
    circle = (
      <View style={[styles.circle, { width: size, height: size }]}>
        <ProgressRing size={size} stroke={3.5} progress={p.taken / p.planned} color={colors.warning} track={colors.border} />
        <AppText variant="bodyStrong">{day}</AppText>
      </View>
    );
  } else {
    circle = (
      <View style={[styles.circle, { width: size, height: size, borderWidth: 1.5, borderColor: colors.border }]}>
        <AppText tone="muted">{day}</AppText>
      </View>
    );
  }

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={[formatDay(date), isToday ? C.today : null, p.planned ? C.dosesTaken(p.taken, p.planned) : null].filter(Boolean).join(', ')}
      onPress={onPress}
      style={({ pressed }) => [styles.day, { opacity: pressed ? 0.7 : future ? 0.6 : 1 }]}
    >
      <AppText variant="label" style={{ color: isToday ? colors.accent : colors.textMuted }}>
        {letter}
      </AppText>
      {/* Today gets a dashed ring around its circle. */}
      <View style={[styles.todayRing, isToday && { borderColor: colors.accent }]}>{circle}</View>
      <AppText variant="caption" tone={isToday ? 'default' : 'muted'} style={isToday ? styles.todayLabel : undefined}>
        {isToday ? C.today : day}
      </AppText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  weekCard: { borderRadius: radius.lg + 4, borderWidth: 1, padding: spacing.md, gap: spacing.md },
  weekRow: { flexDirection: 'row' },
  day: { flex: 1, alignItems: 'center', gap: spacing.xs },
  todayRing: { padding: 2, borderRadius: 30, borderWidth: 1.5, borderStyle: 'dashed', borderColor: 'transparent' },
  circle: { borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  todayLabel: { fontWeight: '600' },
  divider: { height: 1 },
  progressRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  dot: { width: 8, height: 8, borderRadius: 4 },
  track: { height: 8, borderRadius: radius.pill, overflow: 'hidden' },
  fill: { height: 8, borderRadius: radius.pill },
  flex: { flex: 1 },
  card: { borderRadius: radius.lg, borderWidth: StyleSheet.hairlineWidth, padding: spacing.lg, gap: spacing.sm },
  cardHeader: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  doseRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, minHeight: 32 },
  time: { width: 72 },
  status: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  legend: { gap: spacing.sm },
});
