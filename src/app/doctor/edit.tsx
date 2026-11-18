import { router, Stack, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { Alert } from 'react-native';

import { AppText } from '@/components/AppText';
import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { ChipGroup, Field, Input } from '@/components/Form';
import { Screen } from '@/components/Screen';
import { getDoctor, getPerson, linkDoctor, listDoctors, saveDoctor, unlinkDoctor, type Doctor } from '@/db/repo';
import { strings } from '@/i18n/strings';

const S = strings.doctors;

export default function EditDoctorScreen() {
  const { id, personId } = useLocalSearchParams<{ id?: string; personId?: string }>();
  const [loaded, setLoaded] = useState(!id);
  const [name, setName] = useState('');
  const [specialty, setSpecialty] = useState('');
  const [clinic, setClinic] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [notes, setNotes] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [others, setOthers] = useState<Doctor[]>([]);
  const [personName, setPersonName] = useState('');

  useEffect(() => {
    (async () => {
      if (personId) {
        const [all, mine, person] = await Promise.all([listDoctors(), listDoctors(personId), getPerson(personId)]);
        const mineIds = new Set(mine.map((d) => d.id));
        setOthers(all.filter((d) => !mineIds.has(d.id)));
        setPersonName(person?.isSelf ? strings.people.me : person?.name ?? '');
      }
      if (id) {
        const d = await getDoctor(id);
        if (d) {
          setName(d.name);
          setSpecialty(d.specialty ?? '');
          setClinic(d.clinic ?? '');
          setPhone(d.phone ?? '');
          setAddress(d.address ?? '');
          setNotes(d.notes ?? '');
        }
        setLoaded(true);
      }
    })();
  }, [id, personId]);

  if (!loaded) return null;

  const save = async () => {
    if (!name.trim()) return setError(S.nameRequired);
    const clean = (t: string) => t.trim() || null;
    await saveDoctor(
      { name: name.trim(), specialty: clean(specialty), clinic: clean(clinic), phone: clean(phone), address: clean(address), notes: clean(notes) },
      { id, personId },
    );
    router.back();
  };

  const unlink = () =>
    Alert.alert(S.unlinkConfirm(name, personName), undefined, [
      { text: strings.common.cancel, style: 'cancel' },
      {
        text: strings.common.remove,
        style: 'destructive',
        onPress: async () => {
          await unlinkDoctor(personId!, id!);
          router.back();
        },
      },
    ]);

  return (
    <Screen edges={['left', 'right', 'bottom']}>
      <Stack.Screen options={{ title: id ? S.editTitle : S.newTitle }} />

      {!id && others.length ? (
        <Card>
          <AppText variant="label" tone="muted">
            {S.linkExisting}
          </AppText>
          <ChipGroup
            value={null}
            onChange={async (doctorId) => {
              await linkDoctor(personId!, doctorId);
              router.back();
            }}
            options={others.map((d) => ({ value: d.id, label: d.specialty ? `${d.name} · ${d.specialty}` : d.name }))}
          />
        </Card>
      ) : null}

      <Field label={S.name} error={error}>
        <Input value={name} onChangeText={setName} placeholder={S.namePlaceholder} autoFocus={!id && !others.length} />
      </Field>
      <Field label={S.specialty}>
        <Input value={specialty} onChangeText={setSpecialty} placeholder={S.specialtyPlaceholder} />
      </Field>
      <Field label={S.clinic}>
        <Input value={clinic} onChangeText={setClinic} />
      </Field>
      <Field label={S.phone}>
        <Input value={phone} onChangeText={setPhone} keyboardType="phone-pad" />
      </Field>
      <Field label={S.address}>
        <Input value={address} onChangeText={setAddress} multiline />
      </Field>
      <Field label={S.notes}>
        <Input value={notes} onChangeText={setNotes} multiline />
      </Field>

      <Button label={strings.common.save} onPress={save} />
      {id && personId ? <Button label={strings.common.remove} variant="ghost" onPress={unlink} /> : null}
    </Screen>
  );
}
