import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { Pressable, StyleSheet, View } from 'react-native';

import { AppText } from '@/components/AppText';
import { Avatar } from '@/components/Avatar';
import { Button } from '@/components/Button';
import { EmptyState } from '@/components/EmptyState';
import { Screen } from '@/components/Screen';
import { listMedications, listPeople } from '@/db/repo';
import { useData } from '@/hooks/useData';
import { strings } from '@/i18n/strings';
import { radius, spacing, useTheme } from '@/theme';

async function load() {
  const [people, meds] = await Promise.all([listPeople(), listMedications()]);
  return people.map((p) => ({ ...p, medCount: meds.filter((m) => m.personId === p.id).length }));
}

export default function PeopleScreen() {
  const { colors } = useTheme();
  const { data: people } = useData(load);

  return (
    <Screen>
      <AppText variant="display">{strings.people.title}</AppText>

      {people?.map((p) => (
        <Pressable
          key={p.id}
          accessibilityRole="button"
          onPress={() => router.push({ pathname: '/person/[id]', params: { id: p.id } })}
          style={({ pressed }) => [
            styles.row,
            { backgroundColor: colors.surface, borderColor: colors.border, opacity: pressed ? 0.85 : 1 },
          ]}
        >
          <Avatar name={p.isSelf ? strings.people.me : p.name} color={p.color} />
          <View style={styles.flex}>
            <AppText variant="heading">{p.isSelf ? strings.people.me : p.name}</AppText>
            <AppText variant="caption" tone="muted">
              {strings.people.medicineCount(p.medCount)}
            </AppText>
          </View>
          <Ionicons name="chevron-forward" size={20} color={colors.textMuted} />
        </Pressable>
      ))}

      {people && people.length <= 1 ? (
        <EmptyState icon="people-outline" title={strings.people.emptyTitle} body={strings.people.emptyBody} />
      ) : null}
      <Button label={strings.people.add} onPress={() => router.push('/person/edit')} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.lg,
    borderRadius: radius.lg,
    borderWidth: StyleSheet.hairlineWidth,
  },
  flex: { flex: 1 },
});
