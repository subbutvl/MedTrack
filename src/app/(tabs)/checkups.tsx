import { router } from 'expo-router';

import { AppText } from '@/components/AppText';
import { Button } from '@/components/Button';
import { CheckupRow } from '@/components/CheckupRow';
import { EmptyState } from '@/components/EmptyState';
import { Screen } from '@/components/Screen';
import { listCheckups, listPeople } from '@/db/repo';
import { localToday } from '@/domain/dates';
import { useData } from '@/hooks/useData';
import { strings } from '@/i18n/strings';

async function load() {
  const [checkups, people] = await Promise.all([listCheckups(), listPeople()]);
  return { checkups, people: new Map(people.map((p) => [p.id, p])) };
}

export default function CheckupsScreen() {
  const { data } = useData(load);
  const today = localToday();
  const multi = (data?.people.size ?? 0) > 1;
  const visible = data?.checkups.filter((c) => data.people.has(c.personId)) ?? [];

  return (
    <Screen>
      <AppText variant="display">{strings.checkups.title}</AppText>
      {data && visible.length === 0 ? (
        <EmptyState icon="calendar-outline" title={strings.checkups.emptyTitle} body={strings.checkups.emptyBody} />
      ) : null}
      {visible.map((c) => {
        const p = data!.people.get(c.personId);
        return (
          <CheckupRow
            key={c.id}
            checkup={c}
            today={today}
            subtitle={multi ? (p?.isSelf ? strings.people.me : p?.name) : undefined}
            onPress={() => router.push({ pathname: '/checkup/edit', params: { id: c.id } })}
          />
        );
      })}
      <Button label={strings.checkups.add} onPress={() => router.push('/checkup/edit')} />
    </Screen>
  );
}
