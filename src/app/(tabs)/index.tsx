import { StyleSheet, View } from 'react-native';

import { AppText } from '@/components/AppText';
import { Card } from '@/components/Card';
import { EmptyState } from '@/components/EmptyState';
import { Screen } from '@/components/Screen';
import { strings } from '@/i18n/strings';
import { DEFAULT_MEAL_TIMES, type Meal } from '@/domain/types';
import { spacing, useTheme } from '@/theme';

const fmt = (m: number) => `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`;

export default function TodayScreen() {
  const { colors } = useTheme();
  const today = new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long' });

  return (
    <Screen>
      <View>
        <AppText variant="label" tone="muted">
          {today}
        </AppText>
        <AppText variant="display">{strings.today.title}</AppText>
      </View>

      <View style={styles.meals}>
        {(Object.keys(DEFAULT_MEAL_TIMES) as Meal[]).map((meal) => (
          <View key={meal} style={[styles.meal, { backgroundColor: colors.surfaceAlt }]}>
            <AppText variant="caption" tone="muted">
              {strings.meals[meal]}
            </AppText>
            <AppText variant="bodyStrong" tone="primary">
              {fmt(DEFAULT_MEAL_TIMES[meal])}
            </AppText>
          </View>
        ))}
      </View>

      <EmptyState icon="medkit-outline" title={strings.today.emptyTitle} body={strings.today.emptyBody} />

      <Card>
        <AppText variant="heading">Coming next</AppText>
        <AppText tone="muted">
          Dose timeline grouped by meal, with {strings.today.taken}, {strings.today.skip} and {strings.today.snooze}.
        </AppText>
      </Card>
    </Screen>
  );
}

const styles = StyleSheet.create({
  meals: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  meal: { flexGrow: 1, flexBasis: '22%', borderRadius: 12, padding: spacing.md, gap: 2 },
});
