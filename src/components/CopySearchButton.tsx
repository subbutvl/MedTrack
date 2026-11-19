import { Ionicons } from '@expo/vector-icons';
import * as Clipboard from 'expo-clipboard';
import * as WebBrowser from 'expo-web-browser';
import { Pressable, StyleSheet } from 'react-native';

import { drugSearchUrl } from '@/domain/search';
import { strings } from '@/i18n/strings';
import { radius, spacing, useTheme } from '@/theme';
import { AppText } from './AppText';

/** One tap copies the medicine name and opens a browser search for it. */
export function CopySearchButton({ name, iconOnly }: { name: string; iconOnly?: boolean }) {
  const { colors } = useTheme();

  const onPress = async () => {
    await Clipboard.setStringAsync(name);
    await WebBrowser.openBrowserAsync(drugSearchUrl(name));
  };

  if (iconOnly) {
    return (
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={strings.medication.copyAndSearch(name)}
        onPress={onPress}
        hitSlop={6}
        style={({ pressed }) => [styles.icon, { backgroundColor: colors.surfaceAlt, opacity: pressed ? 0.7 : 1 }]}
      >
        <Ionicons name="search" size={18} color={colors.primary} />
      </Pressable>
    );
  }

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={strings.medication.copyAndSearch(name)}
      onPress={onPress}
      hitSlop={8}
      style={({ pressed }) => [styles.chip, { backgroundColor: colors.surfaceAlt, opacity: pressed ? 0.7 : 1 }]}
    >
      <Ionicons name="search" size={14} color={colors.primary} />
      <AppText variant="caption" tone="primary">
        {strings.medication.lookUp}
      </AppText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  icon: { width: 40, height: 40, borderRadius: radius.pill, alignItems: 'center', justifyContent: 'center' },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: radius.pill,
    alignSelf: 'flex-start',
  },
});
