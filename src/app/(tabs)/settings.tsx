import { Pressable, StyleSheet, View } from 'react-native';

import { AppText } from '@/components/AppText';
import { Card } from '@/components/Card';
import { Screen } from '@/components/Screen';
import { strings } from '@/i18n/strings';
import { radius, spacing, useTheme, type ThemePreference } from '@/theme';

const options: { value: ThemePreference; label: string }[] = [
  { value: 'system', label: strings.settings.themeSystem },
  { value: 'light', label: strings.settings.themeLight },
  { value: 'dark', label: strings.settings.themeDark },
];

export default function SettingsScreen() {
  const { colors, preference, setPreference } = useTheme();

  return (
    <Screen>
      <AppText variant="display">{strings.settings.title}</AppText>

      <Card>
        <AppText variant="label" tone="muted">
          {strings.settings.appearance}
        </AppText>
        <View style={[styles.segment, { backgroundColor: colors.surfaceAlt }]} accessibilityRole="radiogroup">
          {options.map((o) => {
            const selected = o.value === preference;
            return (
              <Pressable
                key={o.value}
                accessibilityRole="radio"
                accessibilityState={{ selected }}
                onPress={() => setPreference(o.value)}
                style={[styles.option, selected && { backgroundColor: colors.primary }]}
              >
                <AppText variant="bodyStrong" tone={selected ? 'onPrimary' : 'primary'}>
                  {o.label}
                </AppText>
              </Pressable>
            );
          })}
        </View>
      </Card>

      {[strings.settings.mealTimes, strings.settings.security, strings.settings.backup].map((label) => (
        <Card key={label}>
          <AppText variant="heading">{label}</AppText>
          <AppText variant="caption" tone="muted">
            Coming soon
          </AppText>
        </Card>
      ))}
    </Screen>
  );
}

const styles = StyleSheet.create({
  segment: { flexDirection: 'row', borderRadius: radius.md, padding: spacing.xs, gap: spacing.xs },
  option: { flex: 1, minHeight: 40, borderRadius: radius.sm, alignItems: 'center', justifyContent: 'center' },
});
