import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
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

      <Pressable accessibilityRole="button" onPress={() => router.push('/meal-times')}>
        <Card>
          <View style={styles.row}>
            <View style={styles.flex}>
              <AppText variant="heading">{strings.settings.mealTimes}</AppText>
              <AppText variant="caption" tone="muted">
                {strings.settings.mealTimesHint}
              </AppText>
            </View>
            <Ionicons name="chevron-forward" size={20} color={colors.textMuted} />
          </View>
        </Card>
      </Pressable>

      {[strings.settings.security, strings.settings.backup].map((label) => (
        <Card key={label}>
          <AppText variant="heading">{label}</AppText>
          <AppText variant="caption" tone="muted">
            {strings.settings.comingSoon}
          </AppText>
        </Card>
      ))}
    </Screen>
  );
}

const styles = StyleSheet.create({
  segment: { flexDirection: 'row', borderRadius: radius.md, padding: spacing.xs, gap: spacing.xs },
  option: { flex: 1, minHeight: 40, borderRadius: radius.sm, alignItems: 'center', justifyContent: 'center' },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  flex: { flex: 1 },
});
