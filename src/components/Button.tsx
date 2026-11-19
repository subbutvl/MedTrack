import { Ionicons } from '@expo/vector-icons';
import { Pressable, StyleSheet } from 'react-native';

import { radius, spacing, useTheme } from '@/theme';
import { AppText } from './AppText';

type Props = {
  label: string;
  onPress: () => void;
  /**
   * primary: filled navy. secondary: pale fill. inverted: filled slate. outlined: border only.
   * ghost: text only.
   */
  variant?: 'primary' | 'secondary' | 'inverted' | 'outlined' | 'ghost';
  icon?: keyof typeof Ionicons.glyphMap;
  accessibilityHint?: string;
};

export function Button({ label, onPress, variant = 'primary', icon, accessibilityHint }: Props) {
  const { colors } = useTheme();
  const filled = variant === 'primary' || variant === 'inverted';
  const bg =
    variant === 'primary' ? colors.primary : variant === 'inverted' ? colors.text : variant === 'secondary' ? colors.accentSoft : 'transparent';
  const fg = filled ? (variant === 'inverted' ? colors.background : colors.onPrimary) : colors.primary;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityHint={accessibilityHint}
      onPress={onPress}
      style={({ pressed }) => [
        styles.base,
        { backgroundColor: bg, opacity: pressed ? 0.8 : 1 },
        variant === 'outlined' && { borderWidth: 1, borderColor: colors.textMuted },
      ]}
    >
      {icon ? <Ionicons name={icon} size={18} color={fg} /> : null}
      <AppText variant="bodyStrong" style={{ color: fg }}>
        {label}
      </AppText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    minHeight: 48,
    paddingHorizontal: spacing.lg,
    borderRadius: radius.md,
    flexDirection: 'row',
    gap: spacing.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
