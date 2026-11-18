import type { ReactNode } from 'react';
import { Pressable, ScrollView, StyleSheet, Switch, TextInput, View, type KeyboardTypeOptions } from 'react-native';

import { fonts, radius, spacing, useTheme } from '@/theme';
import { AppText } from './AppText';

export function Field({ label, hint, error, children }: { label: string; hint?: string; error?: string | null; children: ReactNode }) {
  return (
    <View style={styles.field}>
      <AppText variant="label" tone="muted">
        {label}
      </AppText>
      {children}
      {error ? (
        <AppText variant="caption" tone="danger">
          {error}
        </AppText>
      ) : hint ? (
        <AppText variant="caption" tone="muted">
          {hint}
        </AppText>
      ) : null}
    </View>
  );
}

type InputProps = {
  value: string;
  onChangeText: (t: string) => void;
  placeholder?: string;
  keyboardType?: KeyboardTypeOptions;
  multiline?: boolean;
  autoFocus?: boolean;
  accessibilityLabel?: string;
  secureTextEntry?: boolean;
};

export function Input({ multiline, ...props }: InputProps) {
  const { colors } = useTheme();
  return (
    <TextInput
      {...props}
      multiline={multiline}
      placeholderTextColor={colors.tabIconInactive}
      style={[
        styles.input,
        multiline && styles.multiline,
        { color: colors.text, backgroundColor: colors.surface, borderColor: colors.border },
      ]}
    />
  );
}

/**
 * A row of mutually exclusive chips, used for meal, relation, frequency and similar choices.
 * The row scrolls sideways so it stays one line; pass `wrap` to let chips flow onto more lines.
 */
export function ChipGroup<T extends string | number>({
  options,
  value,
  onChange,
  wrap,
}: {
  options: { value: T; label: string }[];
  value: T | null;
  onChange: (v: T) => void;
  wrap?: boolean;
}) {
  const chips = options.map((o) => (
    <Chip key={String(o.value)} label={o.label} selected={o.value === value} onPress={() => onChange(o.value)} />
  ));
  if (wrap) {
    return (
      <View style={styles.chips} accessibilityRole="radiogroup">
        {chips}
      </View>
    );
  }
  return <ChipRow accessibilityRole="radiogroup">{chips}</ChipRow>;
}

/** One line of chips that scrolls sideways when it doesn't fit. */
export function ChipRow({ children, accessibilityRole }: { children: ReactNode; accessibilityRole?: 'radiogroup' }) {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      keyboardShouldPersistTaps="handled"
      accessibilityRole={accessibilityRole}
      contentContainerStyle={styles.chipRow}
    >
      {children}
    </ScrollView>
  );
}

export function Chip({ label, selected, onPress }: { label: string; selected: boolean; onPress: () => void }) {
  const { colors } = useTheme();
  return (
    <Pressable
      accessibilityRole="radio"
      accessibilityState={{ selected }}
      onPress={onPress}
      hitSlop={4}
      style={[
        styles.chip,
        { borderColor: selected ? colors.primary : colors.border, backgroundColor: selected ? colors.primary : colors.surface },
      ]}
    >
      <AppText variant="caption" tone={selected ? 'onPrimary' : 'default'} style={{ fontFamily: fonts.bodyMedium }}>
        {label}
      </AppText>
    </Pressable>
  );
}

export function ToggleRow({ label, value, onValueChange }: { label: string; value: boolean; onValueChange: (v: boolean) => void }) {
  const { colors } = useTheme();
  return (
    <View style={styles.toggle}>
      <AppText style={styles.flex}>{label}</AppText>
      <Switch
        value={value}
        onValueChange={onValueChange}
        trackColor={{ true: colors.accent, false: colors.border }}
        thumbColor={value ? colors.primary : colors.surface}
        accessibilityLabel={label}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  field: { gap: spacing.xs },
  input: {
    minHeight: 48,
    borderWidth: 1,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    fontFamily: fonts.body,
    fontSize: 16,
  },
  multiline: { minHeight: 88, paddingTop: spacing.md, textAlignVertical: 'top' },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  // Vertical padding keeps the chips' hitSlop and borders from being clipped by the scroll view.
  chipRow: { flexDirection: 'row', gap: spacing.sm, paddingVertical: spacing.xs },
  chip: { borderWidth: 1, borderRadius: radius.pill, paddingHorizontal: spacing.md, paddingVertical: spacing.sm, minHeight: 36, justifyContent: 'center' },
  toggle: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, minHeight: 44 },
  flex: { flex: 1 },
});
