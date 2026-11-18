import { Ionicons } from '@expo/vector-icons';
import { Pressable, StyleSheet, View } from 'react-native';

import { AppText } from '@/components/AppText';
import { spacing, useTheme } from '@/theme';

export const PIN_LENGTH = 4;

type Props = {
  value: string;
  onChange: (v: string) => void;
  disabled?: boolean;
  /** Optional extra key in the bottom-left, for example biometric unlock. */
  extra?: { icon: keyof typeof Ionicons.glyphMap; label: string; onPress: () => void };
};

export function PinDots({ length }: { length: number }) {
  const { colors } = useTheme();
  return (
    <View style={styles.dots} accessibilityLabel={`${length} of ${PIN_LENGTH} digits entered`}>
      {Array.from({ length: PIN_LENGTH }, (_, i) => (
        <View key={i} style={[styles.dot, { borderColor: colors.primary, backgroundColor: i < length ? colors.primary : 'transparent' }]} />
      ))}
    </View>
  );
}

export function PinPad({ value, onChange, disabled, extra }: Props) {
  const { colors } = useTheme();
  const press = (d: string) => !disabled && value.length < PIN_LENGTH && onChange(value + d);
  const keys = ['1', '2', '3', '4', '5', '6', '7', '8', '9'];

  const Key = ({ children, onPress, label }: { children: React.ReactNode; onPress: () => void; label: string }) => (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      disabled={disabled}
      style={({ pressed }) => [styles.key, { backgroundColor: pressed ? colors.surfaceAlt : 'transparent', opacity: disabled ? 0.4 : 1 }]}
    >
      {children}
    </Pressable>
  );

  return (
    <View style={styles.pad}>
      {keys.map((k) => (
        <Key key={k} label={k} onPress={() => press(k)}>
          <AppText variant="title">{k}</AppText>
        </Key>
      ))}
      {extra ? (
        <Key label={extra.label} onPress={extra.onPress}>
          <Ionicons name={extra.icon} size={28} color={colors.primary} />
        </Key>
      ) : (
        <View style={styles.key} />
      )}
      <Key label="0" onPress={() => press('0')}>
        <AppText variant="title">0</AppText>
      </Key>
      <Key label="Delete" onPress={() => onChange(value.slice(0, -1))}>
        <Ionicons name="backspace-outline" size={26} color={colors.primary} />
      </Key>
    </View>
  );
}

const styles = StyleSheet.create({
  dots: { flexDirection: 'row', gap: spacing.lg, justifyContent: 'center' },
  dot: { width: 16, height: 16, borderRadius: 8, borderWidth: 2 },
  pad: { flexDirection: 'row', flexWrap: 'wrap', width: 288, alignSelf: 'center' },
  key: { width: 96, height: 72, alignItems: 'center', justifyContent: 'center', borderRadius: 36 },
});
