import type { ReactNode } from 'react';
import { ScrollView, StyleSheet, View, type ViewStyle } from 'react-native';
import { SafeAreaView, type Edge } from 'react-native-safe-area-context';

import { spacing, useTheme } from '@/theme';

type Props = {
  children: ReactNode;
  /** Scrollable content (default true). */
  scroll?: boolean;
  /**
   * Safe-area edges to pad. Tab screens leave out 'bottom' because the tab bar already
   * handles the home indicator. Stack screens without a header should include 'top'.
   */
  edges?: Edge[];
  contentStyle?: ViewStyle;
};

/**
 * Every screen renders inside this, so content never sits under the notch, camera cutout,
 * status bar, or home indicator, in light and dark mode alike.
 */
export function Screen({ children, scroll = true, edges = ['top', 'left', 'right'], contentStyle }: Props) {
  const { colors } = useTheme();
  const inner = [styles.content, contentStyle];

  return (
    <SafeAreaView edges={edges} style={[styles.root, { backgroundColor: colors.background }]}>
      {scroll ? (
        <ScrollView contentContainerStyle={inner} keyboardShouldPersistTaps="handled">
          {children}
        </ScrollView>
      ) : (
        <View style={[styles.flex, ...inner]}>{children}</View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  flex: { flex: 1 },
  content: { padding: spacing.lg, gap: spacing.lg },
});
