import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useState } from 'react';
import { Modal, Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { strings } from '@/i18n/strings';
import { displayName, useActivePerson } from '@/state/ActivePerson';
import { radius, spacing, useTheme } from '@/theme';
import { AppText } from './AppText';
import { Avatar } from './Avatar';

/** A dropdown in the Home header for choosing whose data is shown. */
export function PersonSwitcher() {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const { people, person, setActive } = useActivePerson();
  const [open, setOpen] = useState(false);
  if (!person) return null;
  const name = displayName(person);

  return (
    <>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`${strings.people.viewing} ${name}. ${strings.people.switchTitle}`}
        onPress={() => setOpen(true)}
        hitSlop={6}
        style={({ pressed }) => [styles.trigger, { backgroundColor: colors.surfaceAlt, opacity: pressed ? 0.8 : 1 }]}
      >
        <Avatar name={name} color={person.color} size={28} />
        <AppText variant="bodyStrong" numberOfLines={1} style={styles.shrink}>
          {name}
        </AppText>
        <Ionicons name="chevron-down" size={16} color={colors.textMuted} />
      </Pressable>

      <Modal visible={open} transparent animationType="fade" onRequestClose={() => setOpen(false)} statusBarTranslucent>
        <Pressable accessibilityLabel={strings.common.cancel} style={styles.backdrop} onPress={() => setOpen(false)}>
          <Pressable
            style={[styles.sheet, { backgroundColor: colors.surface, borderColor: colors.border, paddingBottom: insets.bottom + spacing.lg }]}
            onPress={() => {}}
          >
            <AppText variant="heading">{strings.people.switchTitle}</AppText>
            <AppText variant="caption" tone="muted">
              {strings.people.switchHint}
            </AppText>
            <View accessibilityRole="radiogroup" style={styles.list}>
              {people.map((p) => {
                const selected = p.id === person.id;
                return (
                  <Pressable
                    key={p.id}
                    accessibilityRole="radio"
                    accessibilityState={{ selected }}
                    onPress={() => {
                      setOpen(false);
                      void setActive(p.id);
                    }}
                    style={({ pressed }) => [
                      styles.option,
                      { backgroundColor: selected ? colors.surfaceAlt : 'transparent', opacity: pressed ? 0.8 : 1 },
                    ]}
                  >
                    <Avatar name={displayName(p)} color={p.color} size={36} />
                    <AppText variant="bodyStrong" style={styles.shrink}>
                      {displayName(p)}
                    </AppText>
                    {selected ? <Ionicons name="checkmark" size={20} color={colors.primary} /> : null}
                  </Pressable>
                );
              })}
            </View>
            <Pressable
              accessibilityRole="button"
              onPress={() => {
                setOpen(false);
                router.navigate('/settings');
              }}
              style={styles.manage}
              hitSlop={6}
            >
              <Ionicons name="people-outline" size={18} color={colors.primary} />
              <AppText tone="primary" variant="bodyStrong">
                {strings.people.manage}
              </AppText>
            </Pressable>
          </Pressable>
        </Pressable>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  trigger: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    alignSelf: 'flex-start',
    maxWidth: '100%',
    paddingVertical: spacing.xs,
    paddingLeft: spacing.xs,
    paddingRight: spacing.md,
    borderRadius: radius.pill,
  },
  shrink: { flexShrink: 1 },
  backdrop: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(2, 18, 41, 0.45)' },
  sheet: {
    borderTopLeftRadius: radius.lg,
    borderTopRightRadius: radius.lg,
    borderWidth: StyleSheet.hairlineWidth,
    padding: spacing.lg,
    gap: spacing.sm,
  },
  list: { gap: spacing.xs, marginTop: spacing.sm },
  option: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, padding: spacing.sm, borderRadius: radius.md, minHeight: 48 },
  manage: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, alignSelf: 'flex-start', paddingVertical: spacing.md },
});
