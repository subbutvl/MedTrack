import { Ionicons } from '@expo/vector-icons';
import { Pressable, StyleSheet, View } from 'react-native';

import type { Checkup } from '@/db/repo';
import { describeRecurrence } from '@/domain/checkups';
import { daysBetween } from '@/domain/dates';
import { strings } from '@/i18n/strings';
import { radius, spacing, useTheme } from '@/theme';
import { AppText } from './AppText';

/** Within this many days of the next date (or overdue), the row offers a one-tap "Visited". */
const VISIT_WINDOW_DAYS = 7;

export function CheckupRow({
  checkup,
  today,
  subtitle,
  onPress,
  onVisited,
}: {
  checkup: Checkup;
  today: string;
  subtitle?: string;
  onPress: () => void;
  onVisited?: () => void;
}) {
  const { colors } = useTheme();
  const S = strings.checkups;
  const days = checkup.nextDate ? daysBetween(today, checkup.nextDate) : null;
  const when = days == null ? S.noneScheduled : days < 0 ? S.overdue : days === 0 ? S.today : S.inDays(days);
  const tone = days == null ? 'muted' : days < 0 ? 'danger' : days <= 1 ? 'primary' : 'muted';

  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [styles.row, { backgroundColor: colors.surface, borderColor: colors.border, opacity: pressed ? 0.85 : 1 }]}
    >
      <View style={[styles.icon, { backgroundColor: colors.surfaceAlt }]}>
        <Ionicons name="calendar-outline" size={20} color={colors.primary} />
      </View>
      <View style={styles.flex}>
        <AppText variant="heading">{checkup.title}</AppText>
        <AppText variant="caption" tone="muted">
          {[checkup.nextDate, describeRecurrence(checkup.recurrence), subtitle].filter(Boolean).join(' · ')}
        </AppText>
      </View>
      <View style={styles.side}>
        <AppText variant="label" tone={tone}>
          {when}
        </AppText>
        {onVisited && days != null && days <= VISIT_WINDOW_DAYS ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={S.visitedConfirm(checkup.title)}
            onPress={onVisited}
            hitSlop={6}
            style={({ pressed }) => [styles.visited, { backgroundColor: colors.primary, opacity: pressed ? 0.8 : 1 }]}
          >
            <Ionicons name="checkmark" size={14} color={colors.onPrimary} />
            <AppText variant="caption" tone="onPrimary">
              {S.visitedShort}
            </AppText>
          </Pressable>
        ) : null}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, padding: spacing.lg, borderRadius: radius.lg, borderWidth: StyleSheet.hairlineWidth },
  icon: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  flex: { flex: 1 },
  side: { alignItems: 'flex-end', gap: spacing.sm },
  visited: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: spacing.md, paddingVertical: spacing.xs, borderRadius: radius.pill, minHeight: 32 },
});
