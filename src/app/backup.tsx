import { useState } from 'react';
import { ActivityIndicator, Alert, StyleSheet, View } from 'react-native';

import { AppText } from '@/components/AppText';
import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { Field, Input } from '@/components/Form';
import { Screen } from '@/components/Screen';
import { MIN_PASSPHRASE } from '@/domain/backupCrypto';
import { strings } from '@/i18n/strings';
import { exportBackup, pickBackupFile, readBackup, restoreBackup } from '@/services/backup';
import { spacing } from '@/theme';

const B = strings.backup;

function PassInput(props: { value: string; onChangeText: (t: string) => void; label: string }) {
  return (
    <Field label={props.label}>
      <Input value={props.value} onChangeText={props.onChangeText} accessibilityLabel={props.label} secureTextEntry />
    </Field>
  );
}

export default function BackupScreen() {
  const [pass, setPass] = useState('');
  const [pass2, setPass2] = useState('');
  const [exportError, setExportError] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [file, setFile] = useState<{ name: string; text: string } | null>(null);
  const [restorePass, setRestorePass] = useState('');
  const [restoreError, setRestoreError] = useState<string | null>(null);

  const doExport = async () => {
    if (pass.length < MIN_PASSPHRASE) return setExportError(B.tooShort);
    if (pass !== pass2) return setExportError(B.mismatch);
    setExportError(null);
    setBusy(B.working);
    try {
      await exportBackup(pass);
      setPass('');
      setPass2('');
    } catch (e) {
      setExportError(String((e as Error).message ?? e));
    } finally {
      setBusy(null);
    }
  };

  const doRestore = async () => {
    if (!file) return;
    setRestoreError(null);
    setBusy(B.decrypting);
    try {
      const { dump, summary } = await readBackup(file.text, restorePass);
      setBusy(null);
      Alert.alert(B.confirmTitle, B.confirmBody(summary.people, summary.medicines, summary.exportedAt.slice(0, 10)), [
        { text: strings.common.cancel, style: 'cancel' },
        {
          text: B.replace,
          style: 'destructive',
          onPress: async () => {
            await restoreBackup(dump);
            setFile(null);
            setRestorePass('');
            Alert.alert(B.restored);
          },
        },
      ]);
    } catch (e) {
      setBusy(null);
      setRestoreError(String((e as Error).message ?? e));
    }
  };

  return (
    <Screen edges={['left', 'right', 'bottom']}>
      <AppText tone="muted">{B.intro}</AppText>

      <Card>
        <AppText variant="heading">{B.export}</AppText>
        <AppText variant="caption" tone="muted">
          {B.exportHint}
        </AppText>
        <PassInput label={B.passphrase} value={pass} onChangeText={setPass} />
        <PassInput label={B.confirm} value={pass2} onChangeText={setPass2} />
        {exportError ? <AppText tone="danger">{exportError}</AppText> : null}
        <Button label={B.export} onPress={doExport} />
      </Card>

      <Card>
        <AppText variant="heading">{B.restore}</AppText>
        <AppText variant="caption" tone="muted">
          {B.restoreHint}
        </AppText>
        <Button
          label={B.chooseFile}
          variant="secondary"
          onPress={async () => {
            const f = await pickBackupFile();
            if (f) setFile(f);
          }}
        />
        {file ? (
          <>
            <AppText variant="caption">{B.chosen(file.name)}</AppText>
            <PassInput label={B.passphrase} value={restorePass} onChangeText={setRestorePass} />
            {restoreError ? <AppText tone="danger">{restoreError}</AppText> : null}
            <Button label={B.restore} onPress={doRestore} />
          </>
        ) : null}
      </Card>

      {busy ? (
        <View style={styles.busy}>
          <ActivityIndicator />
          <AppText tone="muted">{busy}</AppText>
        </View>
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  busy: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.sm },
});
