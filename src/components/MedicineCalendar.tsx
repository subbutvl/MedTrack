import { Ionicons } from '@expo/vector-icons';
import { useMemo, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { listDoseEventsBetween, type Medication } from '@/db/repo';
import { dayProgress, dosesOn, monthGridRange, weekOf } from '@/domain/calendar';
import { formatMinute, type DoseStatus, type TimelineItem, type TimelineMedication } from '@/domain/timeline';
import type { ISODate, MealTimes } from '@/domain/types';
import { useData, useMinuteTick } from '@/hooks/useData';
import { localToday } from '@/domain/dates';
import { strings } from '@/i18n/strings';
import { radius, spacing, useTheme } from '@/theme';
import { AppText } from './AppText';
import { formatDay, LegendItem, MonthCalendar, WeekStrip, type DayMark } from './Calendar';

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

/** Week rings for one person's doses, with the full month a tap away and the chosen day's doses below. */
export function MedicineCalendar({ personId, meds, meals }: { personId: string; meds: Medication[]; meals: MealTimes }) {
  const { colors } = useTheme();
  const now = useMinuteTick();
  const today = localToday(now);
  const nowMinute = now.getHours() * 60 + now.getMinutes();
  const [selected, setSelected] = useState<ISODate>(today);
  const [month, setMonth] = useState<ISODate | null>(null);

  // Load the log for the visible week, plus the visible month while it is open.
  const week = weekOf(selected);
  const grid = month ? monthGridRange(month) : null;
  const from = grid && grid.from < week[0] ? grid.from : week[0];
  const to = grid && grid.to > week[6] ? grid.to : week[6];
  const { data: events } = useData(() => listDoseEventsBetween(from, to), [from, to, personId]);

  const timelineMeds = useMemo<TimelineMedication[]>(
    () =>
      meds
        .filter((m) => m.active)
        .map((m) => ({ id: m.id, personId: m.personId, name: m.name, strength: m.strength, schedule: m.schedule, meals })),
    [meds, meals],
  );

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
    <View style={styles.gap}>
      <WeekStrip selected={selected} today={today} markFor={markFor} onSelect={setSelected} onOpenMonth={() => setMonth(selected)} />
      {detail(selected)}
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
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  gap: { gap: spacing.md },
  card: { borderRadius: radius.lg, borderWidth: StyleSheet.hairlineWidth, padding: spacing.lg, gap: spacing.sm },
  cardHeader: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  doseRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, minHeight: 32 },
  time: { width: 72 },
  status: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  legend: { gap: spacing.sm },
});
