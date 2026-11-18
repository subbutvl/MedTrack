import { Ionicons } from '@expo/vector-icons';
import { Pressable, StyleSheet, View } from 'react-native';

import type { TimelineItem } from '@/domain/timeline';
import { formatMinute } from '@/domain/timeline';
import { strings } from '@/i18n/strings';
import { radius, spacing, useTheme } from '@/theme';
import { AppText } from './AppText';
import { CopySearchButton } from './CopySearchButton';

type Props = {
  item: TimelineItem;
  personName?: string;
  onTaken: () => void;
  onSkip: () => void;
  onSnooze: () => void;
  onUndo: () => void;
};

export function DoseCard({ item, personName, onTaken, onSkip, onSnooze, onUndo }: Props) {
  const { colors } = useTheme();
  const done = item.status === 'taken' || item.status === 'skipped';
  const statusTone =
    item.status === 'taken' ? 'success' : item.status === 'overdue' || item.status === 'missed' ? 'danger' : item.status === 'due' ? 'primary' : 'muted';
  const statusLabel = strings.today.status[item.status];
  const amount = item.amount === 1 ? '1 dose' : `${item.amount} doses`;

  return (
    <View
      style={[
        styles.card,
        { backgroundColor: colors.surface, borderColor: item.status === 'due' ? colors.accent : colors.border, opacity: done ? 0.75 : 1 },
      ]}
    >
      <View style={styles.header}>
        <View style={styles.flex}>
          <AppText variant="heading" numberOfLines={2}>
            {item.name}
            {item.strength ? <AppText tone="muted"> {item.strength}</AppText> : null}
          </AppText>
          <AppText variant="caption" tone="muted">
            {formatMinute(item.minute)} · {amount}
            {personName ? ` · ${personName}` : ''}
          </AppText>
        </View>
        <AppText variant="label" tone={statusTone}>
          {statusLabel}
        </AppText>
      </View>

      <CopySearchButton name={item.strength ? `${item.name} ${item.strength}` : item.name} />

      {done ? (
        <Pressable accessibilityRole="button" onPress={onUndo} style={styles.undo} hitSlop={8}>
          <Ionicons name="arrow-undo" size={16} color={colors.primary} />
          <AppText variant="caption" tone="primary">
            {strings.today.undo}
          </AppText>
        </Pressable>
      ) : (
        <View style={styles.actions}>
          <Action icon="checkmark" label={strings.today.taken} onPress={onTaken} primary />
          <Action icon="alarm-outline" label={strings.today.snooze} onPress={onSnooze} />
          <Action icon="close" label={strings.today.skip} onPress={onSkip} />
        </View>
      )}
    </View>
  );
}

function Action({ icon, label, onPress, primary }: { icon: keyof typeof Ionicons.glyphMap; label: string; onPress: () => void; primary?: boolean }) {
  const { colors } = useTheme();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      style={({ pressed }) => [
        styles.action,
        { backgroundColor: primary ? colors.primary : colors.surfaceAlt, opacity: pressed ? 0.8 : 1 },
      ]}
    >
      <Ionicons name={icon} size={18} color={primary ? colors.onPrimary : colors.primary} />
      <AppText variant="bodyStrong" tone={primary ? 'onPrimary' : 'primary'}>
        {label}
      </AppText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: { borderWidth: 1, borderRadius: radius.lg, padding: spacing.lg, gap: spacing.md },
  header: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.md },
  flex: { flex: 1 },
  actions: { flexDirection: 'row', gap: spacing.sm },
  action: {
    flex: 1,
    minHeight: 44,
    borderRadius: radius.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
  },
  undo: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs, alignSelf: 'flex-start' },
});
