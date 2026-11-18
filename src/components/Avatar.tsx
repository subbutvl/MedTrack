import { StyleSheet, View } from 'react-native';

import { useTheme } from '@/theme';
import { AppText } from './AppText';

export function Avatar({ name, color, size = 44 }: { name: string; color?: string | null; size?: number }) {
  const { colors } = useTheme();
  const initial = name.trim().charAt(0).toUpperCase() || '?';
  return (
    <View style={[styles.base, { width: size, height: size, borderRadius: size / 2, backgroundColor: color ?? colors.primary }]}>
      <AppText variant="heading" tone="onPrimary">
        {initial}
      </AppText>
    </View>
  );
}

const styles = StyleSheet.create({ base: { alignItems: 'center', justifyContent: 'center' } });
