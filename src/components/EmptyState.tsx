import { Ionicons } from '@expo/vector-icons';
import type { ComponentProps } from 'react';
import { StyleSheet, View } from 'react-native';

import { spacing, useTheme } from '@/theme';
import { AppText } from './AppText';
import { Card } from './Card';

type Props = { icon: ComponentProps<typeof Ionicons>['name']; title: string; body: string };

export function EmptyState({ icon, title, body }: Props) {
  const { colors } = useTheme();
  return (
    <Card style={styles.card}>
      <View style={[styles.icon, { backgroundColor: colors.surfaceAlt }]}>
        <Ionicons name={icon} size={28} color={colors.primary} />
      </View>
      <AppText variant="heading" style={styles.center}>
        {title}
      </AppText>
      <AppText tone="muted" style={styles.center}>
        {body}
      </AppText>
    </Card>
  );
}

const styles = StyleSheet.create({
  card: { alignItems: 'center', paddingVertical: spacing.xxl },
  icon: { width: 56, height: 56, borderRadius: 28, alignItems: 'center', justifyContent: 'center' },
  center: { textAlign: 'center' },
});
