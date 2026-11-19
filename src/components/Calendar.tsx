import { Ionicons } from '@expo/vector-icons';
import type { ReactNode } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Svg, { Circle } from 'react-native-svg';

import { monthGrid, shiftMonth, weekOf } from '@/domain/calendar';
import { addDays, parseDate } from '@/domain/dates';
import type { ISODate } from '@/domain/types';
import { strings } from '@/i18n/strings';
import { radius, spacing, useTheme } from '@/theme';
import { AppText } from './AppText';

const C = strings.calendar;

/** What a day shows: a ring that fills from 0 to 1, and small dots under the date. */
export type DayMark = {
  /** Omit for no ring. 0 shows only the track. */
  progress?: number;
  /** Ring colour; defaults to the accent colour. */
  ringColor?: string;
  dots?: string[];
  /** Read out by screen readers after the date. */
  label?: string;
};

const fmt = (d: ISODate, opts: Intl.DateTimeFormatOptions) => parseDate(d).toLocaleDateString('en-IN', { ...opts, timeZone: 'UTC' });

/** "Thu, 19 Nov" */
export const formatDay = (d: ISODate) => fmt(d, { weekday: 'short', day: 'numeric', month: 'short' });

function weekTitle(days: ISODate[], today: ISODate) {
  if (days.includes(today)) return C.thisWeek;
  return `${fmt(days[0], { day: 'numeric', month: 'short' })} – ${fmt(days[6], { day: 'numeric', month: 'short' })}`;
}

function ProgressRing({ size, stroke, progress, color, track }: { size: number; stroke: number; progress: number; color: string; track: string }) {
  const r = (size - stroke) / 2;
  const circumference = 2 * Math.PI * r;
  const p = Math.max(0, Math.min(1, progress));
  return (
    <Svg width={size} height={size} style={StyleSheet.absoluteFill}>
      <Circle cx={size / 2} cy={size / 2} r={r} stroke={track} strokeWidth={stroke} fill="none" />
      {p > 0 ? (
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          stroke={color}
          strokeWidth={stroke}
          fill="none"
          strokeLinecap="round"
          strokeDasharray={`${circumference} ${circumference}`}
          strokeDashoffset={circumference * (1 - p)}
          // Start at 12 o'clock and fill clockwise.
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
        />
      ) : null}
    </Svg>
  );
}

function DayCell({
  date,
  mark,
  selected,
  isToday,
  size,
  onPress,
}: {
  date: ISODate;
  mark?: DayMark;
  selected: boolean;
  isToday: boolean;
  size: number;
  onPress: () => void;
}) {
  const { colors } = useTheme();
  const day = Number(date.slice(8));
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected }}
      accessibilityLabel={[formatDay(date), isToday ? C.today : null, mark?.label].filter(Boolean).join(', ')}
      onPress={onPress}
      style={({ pressed }) => [styles.cell, { opacity: pressed ? 0.7 : 1 }]}
    >
      <View
        style={[
          styles.ringBox,
          { width: size, height: size, borderRadius: size / 2 },
          selected && { backgroundColor: colors.surfaceAlt },
        ]}
      >
        {mark?.progress != null ? (
          <ProgressRing size={size} stroke={size > 36 ? 4 : 3.5} progress={mark.progress} color={mark.ringColor ?? colors.accent} track={colors.border} />
        ) : null}
        <AppText variant={selected || isToday ? 'bodyStrong' : 'body'} tone={isToday ? 'primary' : 'default'} style={styles.dayNumber}>
          {day}
        </AppText>
      </View>
      <View style={styles.dots}>
        {(mark?.dots ?? []).slice(0, 3).map((c, i) => (
          <View key={i} style={[styles.dot, { backgroundColor: c }]} />
        ))}
      </View>
    </Pressable>
  );
}

function WeekdayHeadings({ today, days }: { today?: ISODate; days?: ISODate[] }) {
  return (
    <View style={styles.weekRow}>
      {C.weekdays.map((w, i) => (
        <AppText key={i} variant="label" tone={days && days[i] === today ? 'primary' : 'muted'} style={styles.weekday}>
          {w}
        </AppText>
      ))}
    </View>
  );
}

function IconButton({ icon, label, onPress }: { icon: keyof typeof Ionicons.glyphMap; label: string; onPress: () => void }) {
  const { colors } = useTheme();
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={label} onPress={onPress} hitSlop={6} style={({ pressed }) => [styles.iconButton, { opacity: pressed ? 0.6 : 1 }]}>
      <Ionicons name={icon} size={22} color={colors.primary} />
    </Pressable>
  );
}

/**
 * A quick view of one week: a ring per day that fills as the day's goal is met, with the
 * calendar icon opening the full month. Arrows move a week at a time.
 */
export function WeekStrip({
  selected,
  today,
  markFor,
  onSelect,
  onOpenMonth,
}: {
  selected: ISODate;
  today: ISODate;
  markFor: (d: ISODate) => DayMark | undefined;
  onSelect: (d: ISODate) => void;
  onOpenMonth: () => void;
}) {
  const { colors } = useTheme();
  const days = weekOf(selected);
  return (
    <View style={[styles.strip, { backgroundColor: colors.surface, borderColor: colors.border }]}>
      <View style={styles.stripHeader}>
        <AppText variant="heading" style={styles.flex}>
          {weekTitle(days, today)}
        </AppText>
        {!days.includes(today) ? (
          <Pressable accessibilityRole="button" onPress={() => onSelect(today)} hitSlop={6} style={styles.todayButton}>
            <AppText variant="label" tone="primary">
              {C.today}
            </AppText>
          </Pressable>
        ) : null}
        <IconButton icon="chevron-back" label={C.previousWeek} onPress={() => onSelect(addDays(selected, -7))} />
        <IconButton icon="chevron-forward" label={C.nextWeek} onPress={() => onSelect(addDays(selected, 7))} />
        <IconButton icon="calendar-outline" label={C.openMonth} onPress={onOpenMonth} />
      </View>
      <WeekdayHeadings today={today} days={days} />
      <View style={styles.weekRow}>
        {days.map((d) => (
          <DayCell key={d} date={d} mark={markFor(d)} selected={d === selected} isToday={d === today} size={38} onPress={() => onSelect(d)} />
        ))}
      </View>
    </View>
  );
}

/** The full month of rings, opened from the week strip's calendar icon. Tapping a day picks it. */
export function MonthCalendar({
  visible,
  month,
  selected,
  today,
  markFor,
  onMonthChange,
  onSelect,
  onClose,
  footer,
}: {
  visible: boolean;
  /** Any date in the month to show. */
  month: ISODate;
  selected: ISODate;
  today: ISODate;
  markFor: (d: ISODate) => DayMark | undefined;
  onMonthChange: (month: ISODate) => void;
  onSelect: (d: ISODate) => void;
  onClose: () => void;
  footer?: ReactNode;
}) {
  const { colors } = useTheme();
  const weeks = monthGrid(month);
  const title = fmt(`${month.slice(0, 7)}-01`, { month: 'long', year: 'numeric' });

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <SafeAreaView edges={['top', 'bottom', 'left', 'right']} style={[styles.flex, { backgroundColor: colors.background }]}>
        <View style={[styles.modalHeader, { borderBottomColor: colors.border }]}>
          <IconButton icon="chevron-back" label={C.previousMonth} onPress={() => onMonthChange(shiftMonth(month, -1))} />
          <AppText variant="title" style={[styles.flex, styles.center]}>
            {title}
          </AppText>
          <IconButton icon="chevron-forward" label={C.nextMonth} onPress={() => onMonthChange(shiftMonth(month, 1))} />
        </View>
        <ScrollView contentContainerStyle={styles.modalBody}>
          <View style={[styles.strip, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <WeekdayHeadings />
            {weeks.map((week, i) => (
              <View key={i} style={styles.weekRow}>
                {week.map((d, j) =>
                  d ? (
                    <DayCell key={d} date={d} mark={markFor(d)} selected={d === selected} isToday={d === today} size={40} onPress={() => onSelect(d)} />
                  ) : (
                    <View key={`blank-${j}`} style={styles.cell} />
                  ),
                )}
              </View>
            ))}
          </View>
          {footer}
        </ScrollView>
        <View style={[styles.modalFooter, { borderTopColor: colors.border }]}>
          <Pressable accessibilityRole="button" onPress={() => onMonthChange(today)} hitSlop={6} style={styles.footerButton}>
            <AppText variant="bodyStrong" tone="primary">
              {C.today}
            </AppText>
          </Pressable>
          <Pressable
            accessibilityRole="button"
            onPress={onClose}
            style={({ pressed }) => [styles.doneButton, { backgroundColor: colors.primary, opacity: pressed ? 0.85 : 1 }]}
          >
            <AppText variant="bodyStrong" tone="onPrimary">
              {C.done}
            </AppText>
          </Pressable>
        </View>
      </SafeAreaView>
    </Modal>
  );
}

/** A small key that explains a dot colour. */
export function LegendItem({ color, label, ring }: { color: string; label: string; ring?: boolean }) {
  return (
    <View style={styles.legendItem}>
      <View style={[ring ? styles.legendRing : styles.dot, ring ? { borderColor: color } : { backgroundColor: color }]} />
      <AppText variant="caption" tone="muted">
        {label}
      </AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  center: { textAlign: 'center' },
  strip: { borderRadius: radius.lg, borderWidth: StyleSheet.hairlineWidth, padding: spacing.md, gap: spacing.xs },
  stripHeader: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs, marginBottom: spacing.xs },
  todayButton: { paddingHorizontal: spacing.sm, minHeight: 32, justifyContent: 'center' },
  iconButton: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
  weekRow: { flexDirection: 'row' },
  weekday: { flex: 1, textAlign: 'center' },
  cell: { flex: 1, alignItems: 'center', paddingVertical: spacing.xs, gap: 3, minHeight: 48 },
  ringBox: { alignItems: 'center', justifyContent: 'center' },
  dayNumber: { fontSize: 14, lineHeight: 18 },
  dots: { flexDirection: 'row', gap: 3, height: 6 },
  dot: { width: 6, height: 6, borderRadius: 3 },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  legendRing: { width: 12, height: 12, borderRadius: 6, borderWidth: 2.5 },
  modalHeader: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: spacing.md, paddingVertical: spacing.md, borderBottomWidth: StyleSheet.hairlineWidth },
  modalBody: { padding: spacing.lg, gap: spacing.lg },
  modalFooter: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: spacing.lg, borderTopWidth: StyleSheet.hairlineWidth },
  footerButton: { minHeight: 44, justifyContent: 'center' },
  doneButton: { minHeight: 44, paddingHorizontal: spacing.xl, borderRadius: radius.pill, alignItems: 'center', justifyContent: 'center' },
});
