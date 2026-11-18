import { StyleSheet, View } from 'react-native';

import { AppText } from '@/components/AppText';
import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { CopySearchButton } from '@/components/CopySearchButton';
import { EmptyState } from '@/components/EmptyState';
import { Screen } from '@/components/Screen';
import { strings } from '@/i18n/strings';
import { spacing, useTheme } from '@/theme';

export default function PeopleScreen() {
  const { colors } = useTheme();

  return (
    <Screen>
      <AppText variant="display">{strings.people.title}</AppText>

      <Card>
        <View style={styles.row}>
          <View style={[styles.avatar, { backgroundColor: colors.primary }]}>
            <AppText variant="heading" tone="onPrimary">
              M
            </AppText>
          </View>
          <View style={styles.flex}>
            <AppText variant="heading">{strings.people.me}</AppText>
            <AppText variant="caption" tone="muted">
              0 medicines · no checkups
            </AppText>
          </View>
        </View>
        {/* Example of the one-tap lookup, to be shown on each medicine row. */}
        <CopySearchButton name="Metformin 500 mg" />
      </Card>

      <EmptyState icon="people-outline" title={strings.people.emptyTitle} body={strings.people.emptyBody} />
      <Button label={strings.people.add} onPress={() => {}} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  avatar: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  flex: { flex: 1 },
});
