import { Ionicons } from '@expo/vector-icons';
import { router, Stack, useLocalSearchParams } from 'expo-router';
import { Linking, Pressable, StyleSheet, View } from 'react-native';

import { AppText } from '@/components/AppText';
import { Avatar } from '@/components/Avatar';
import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { CheckupRow } from '@/components/CheckupRow';
import { CopySearchButton } from '@/components/CopySearchButton';
import { Screen } from '@/components/Screen';
import { getGlobalMealTimes, getPerson, listCheckups, listDoctors, listMedications } from '@/db/repo';
import { localToday } from '@/domain/dates';
import { describeSchedule } from '@/domain/describe';
import { useData } from '@/hooks/useData';
import { strings } from '@/i18n/strings';
import { radius, spacing, useTheme } from '@/theme';

async function load(id: string) {
  const [person, meds, global, doctors, checkups] = await Promise.all([
    getPerson(id),
    listMedications(id),
    getGlobalMealTimes(),
    listDoctors(id),
    listCheckups(id),
  ]);
  return { person, meds, meals: person?.mealTimes ?? global, doctors, checkups };
}

export default function PersonScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { colors } = useTheme();
  const { data } = useData(() => load(id), [id]);
  const person = data?.person;
  if (!data) return null;
  if (!person) return null;
  const title = person.isSelf ? strings.people.me : person.name;

  return (
    <Screen edges={['left', 'right', 'bottom']}>
      <Stack.Screen
        options={{
          title,
          headerRight: () => (
            <Pressable accessibilityRole="button" accessibilityLabel={strings.common.edit} hitSlop={8} onPress={() => router.push({ pathname: '/person/edit', params: { id } })}>
              <Ionicons name="create-outline" size={22} color={colors.primary} />
            </Pressable>
          ),
        }}
      />

      <View style={styles.header}>
        <Avatar name={title} color={person.color} size={56} />
        <View style={styles.flex}>
          <AppText variant="title">{title}</AppText>
          <AppText variant="caption" tone="muted">
            {strings.people.medicineCount(data.meds.length)}
          </AppText>
        </View>
      </View>

      <AppText variant="label" tone="muted">
        {strings.people.medicines}
      </AppText>
      {data.meds.length === 0 ? <AppText tone="muted">{strings.people.noMedicines}</AppText> : null}
      {data.meds.map((m) => (
        <Pressable
          key={m.id}
          accessibilityRole="button"
          onPress={() => router.push({ pathname: '/medication/edit', params: { id: m.id } })}
          style={({ pressed }) => [styles.med, { backgroundColor: colors.surface, borderColor: colors.border, opacity: pressed ? 0.85 : 1 }]}
        >
          <View style={styles.flex}>
            <AppText variant="heading">
              {m.name}
              {m.strength ? <AppText tone="muted"> {m.strength}</AppText> : null}
            </AppText>
            <AppText variant="caption" tone="muted">
              {describeSchedule(m.schedule, data.meals)}
            </AppText>
            <View style={{ marginTop: spacing.sm }}>
              <CopySearchButton name={m.strength ? `${m.name} ${m.strength}` : m.name} />
            </View>
          </View>
          <Ionicons name="chevron-forward" size={20} color={colors.textMuted} />
        </Pressable>
      ))}

      <Button label={strings.medication.newTitle} onPress={() => router.push({ pathname: '/medication/edit', params: { personId: id } })} />

      <AppText variant="label" tone="muted">
        {strings.checkups.title}
      </AppText>
      {data.checkups.length === 0 ? <AppText tone="muted">{strings.people.noCheckups}</AppText> : null}
      {data.checkups.map((c) => (
        <CheckupRow key={c.id} checkup={c} today={localToday()} onPress={() => router.push({ pathname: '/checkup/edit', params: { id: c.id } })} />
      ))}
      <Button label={strings.checkups.add} variant="secondary" onPress={() => router.push({ pathname: '/checkup/edit', params: { personId: id } })} />

      <AppText variant="label" tone="muted">
        {strings.doctors.title}
      </AppText>
      {data.doctors.length === 0 ? <AppText tone="muted">{strings.doctors.none}</AppText> : null}
      {data.doctors.map((d) => (
        <Card key={d.id}>
          <Pressable accessibilityRole="button" onPress={() => router.push({ pathname: '/doctor/edit', params: { id: d.id, personId: id } })}>
            <AppText variant="heading">{d.name}</AppText>
            <AppText variant="caption" tone="muted">
              {[d.specialty, d.clinic].filter(Boolean).join(' · ') || ' '}
            </AppText>
          </Pressable>
          {d.phone ? (
            <Pressable accessibilityRole="button" onPress={() => Linking.openURL(`tel:${d.phone}`)} style={styles.call} hitSlop={6}>
              <Ionicons name="call-outline" size={16} color={colors.primary} />
              <AppText variant="caption" tone="primary">
                {strings.doctors.call} {d.phone}
              </AppText>
            </Pressable>
          ) : null}
        </Card>
      ))}
      <Button label={strings.doctors.add} variant="secondary" onPress={() => router.push({ pathname: '/doctor/edit', params: { personId: id } })} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  flex: { flex: 1 },
  call: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs, alignSelf: 'flex-start' },
  med: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, padding: spacing.lg, borderRadius: radius.lg, borderWidth: StyleSheet.hairlineWidth },
});
