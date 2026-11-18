import { Ionicons } from '@expo/vector-icons';
import { Pressable, StyleSheet, View } from 'react-native';

import type { Checkup } from '@/db/repo';
import { describeRecurrence } from '@/domain/checkups';
import { daysBetween } from '@/domain/dates';
import { strings } from '@/i18n/strings';
import { radius, spacing, useTheme } from '@/theme';
import { AppText } from './AppText';

export function CheckupRow({ checkup, today, subtitle, onPress }: { checkup: Checkup; today: string; subtitle?: string; onPress: () => void }) {
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
      <AppText variant="label" tone={tone}>
        {when}
      </AppText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, padding: spacing.lg, borderRadius: radius.lg, borderWidth: StyleSheet.hairlineWidth },
  icon: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  flex: { flex: 1 },
});
