import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { listVisitsForPerson, type Checkup } from '@/db/repo';
import { checkupDays, monthGridRange, weekOf, type CheckupDayKind } from '@/domain/calendar';
import { localToday } from '@/domain/dates';
import type { ISODate } from '@/domain/types';
import { useData } from '@/hooks/useData';
import { strings } from '@/i18n/strings';
import { radius, spacing, useTheme } from '@/theme';
import { AppText } from './AppText';
import { formatDay, LegendItem, MonthCalendar, WeekStrip, type DayMark } from './Calendar';

const C = strings.calendar;
const KINDS: CheckupDayKind[] = ['overdue', 'scheduled', 'visited', 'expected'];

/** Week view of one person's checkups (visits, the next date and expected repeats), with the full month a tap away. */
export function CheckupCalendar({ personId, checkups }: { personId: string; checkups: Checkup[] }) {
  const { colors } = useTheme();
  const today = localToday();
  const [selected, setSelected] = useState<ISODate>(today);
  const [month, setMonth] = useState<ISODate | null>(null);
  const { data: visits } = useData(() => listVisitsForPerson(personId), [personId]);

  const week = weekOf(selected);
  const grid = month ? monthGridRange(month) : null;
  const from = grid && grid.from < week[0] ? grid.from : week[0];
  const to = grid && grid.to > week[6] ? grid.to : week[6];
  const days = useMemo(() => checkupDays(checkups, visits ?? [], from, to, today), [checkups, visits, from, to, today]);

  const kindColor: Record<CheckupDayKind, string> = {
    visited: colors.success,
    scheduled: colors.primary,
    overdue: colors.danger,
    expected: colors.textMuted,
  };

  const markFor = (d: ISODate): DayMark | undefined => {
    const list = days.get(d);
    if (!list?.length) return undefined;
    const kinds = KINDS.filter((k) => list.some((x) => x.kind === k));
    return { dots: kinds.map((k) => kindColor[k]), label: list.map((x) => `${x.title}, ${C.checkupKinds[x.kind]}`).join('; ') };
  };

  const detail = (d: ISODate) => {
    const list = days.get(d) ?? [];
    return (
      <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <AppText variant="heading">{d === today ? C.today : formatDay(d)}</AppText>
        {list.length === 0 ? (
          <AppText tone="muted">{C.noCheckups}</AppText>
        ) : (
          list.map((x) => (
            <Pressable
              key={`${x.checkupId}:${x.kind}`}
              accessibilityRole="button"
              onPress={() => {
                setMonth(null);
                router.push({ pathname: '/checkup/edit', params: { id: x.checkupId } });
              }}
              style={({ pressed }) => [styles.row, { opacity: pressed ? 0.7 : 1 }]}
            >
              <View style={[styles.dot, { backgroundColor: kindColor[x.kind] }]} />
              <AppText style={styles.flex} numberOfLines={1}>
                {x.title}
              </AppText>
              <AppText variant="caption" tone={x.kind === 'overdue' ? 'danger' : x.kind === 'visited' ? 'success' : 'muted'}>
                {C.checkupKinds[x.kind]}
              </AppText>
              <Ionicons name="chevron-forward" size={16} color={colors.textMuted} />
            </Pressable>
          ))
        )}
        {list.some((x) => x.kind === 'expected') ? (
          <AppText variant="caption" tone="muted">
            {C.expectedHint}
          </AppText>
        ) : null}
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
              {KINDS.map((k) => (
                <LegendItem key={k} color={kindColor[k]} label={C.checkupKinds[k]} />
              ))}
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
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, minHeight: 36 },
  dot: { width: 8, height: 8, borderRadius: 4 },
  legend: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.lg },
});
