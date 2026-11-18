import { useCallback, useEffect, useState } from 'react';
import { Alert, StyleSheet, View } from 'react-native';

import { AppText } from '@/components/AppText';
import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { ChipGroup, ToggleRow } from '@/components/Form';
import { Screen } from '@/components/Screen';
import { strings } from '@/i18n/strings';
import { biometricsAvailable, getLockConfig, removePin, setPin, updateLockSettings, verifyPin, type LockConfig } from '@/security/lock';
import { useLock } from '@/security/LockProvider';
import { PIN_LENGTH, PinDots, PinPad } from '@/security/PinPad';
import { spacing } from '@/theme';

const L = strings.lock;
type Step = { kind: 'idle' } | { kind: 'current'; then: 'change' | 'remove' } | { kind: 'new' } | { kind: 'confirm'; first: string };

export default function AppLockScreen() {
  const { refresh } = useLock();
  const [config, setConfig] = useState<LockConfig | null>(null);
  const [canBio, setCanBio] = useState(false);
  const [step, setStep] = useState<Step>({ kind: 'idle' });
  const [pin, setPinValue] = useState('');
  const [message, setMessage] = useState<string | null>(null);

  const load = useCallback(async () => {
    setConfig(await getLockConfig());
    setCanBio(await biometricsAvailable());
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const done = async (msg: string) => {
    setStep({ kind: 'idle' });
    setPinValue('');
    setMessage(null);
    await load();
    await refresh();
    Alert.alert(msg);
  };

  const onPin = async (v: string) => {
    setPinValue(v);
    if (v.length < PIN_LENGTH) return;
    setPinValue('');
    if (step.kind === 'current') {
      const r = await verifyPin(v);
      if (!r.ok) return setMessage(r.lockedUntil ? L.tooMany : L.wrong(r.attemptsLeft));
      setMessage(null);
      if (step.then === 'remove') {
        await removePin();
        return done(L.pinRemoved);
      }
      return setStep({ kind: 'new' });
    }
    if (step.kind === 'new') return setStep({ kind: 'confirm', first: v });
    if (step.kind === 'confirm') {
      if (v !== step.first) {
        setMessage(L.mismatch);
        return setStep({ kind: 'new' });
      }
      await setPin(v, config);
      return done(L.pinSet);
    }
  };

  if (step.kind !== 'idle') {
    const prompt = step.kind === 'current' ? L.currentPin : step.kind === 'new' ? L.newPin : L.confirmPin;
    return (
      <Screen edges={['left', 'right', 'bottom']} scroll={false} contentStyle={styles.center}>
        <View style={styles.prompt}>
          <AppText variant="heading">{prompt}</AppText>
          <PinDots length={pin.length} />
          <AppText tone="danger" style={styles.msg}>
            {message ?? ' '}
          </AppText>
        </View>
        <PinPad value={pin} onChange={onPin} />
        <Button label={strings.common.cancel} variant="ghost" onPress={() => (setStep({ kind: 'idle' }), setMessage(null), setPinValue(''))} />
      </Screen>
    );
  }

  return (
    <Screen edges={['left', 'right', 'bottom']}>
      <Card>
        <AppText variant="heading">{config ? L.on : L.off}</AppText>
        {config ? (
          <>
            <Button label={L.changePin} variant="secondary" onPress={() => setStep({ kind: 'current', then: 'change' })} />
            <Button label={L.removePin} variant="ghost" onPress={() => setStep({ kind: 'current', then: 'remove' })} />
          </>
        ) : (
          <Button label={L.setPin} onPress={() => setStep({ kind: 'new' })} />
        )}
      </Card>

      {config ? (
        <>
          <Card>
            {canBio ? (
              <ToggleRow
                label={L.biometrics}
                value={config.biometrics}
                onValueChange={async (biometrics) => {
                  await updateLockSettings({ biometrics });
                  await load();
                  await refresh();
                }}
              />
            ) : (
              <AppText tone="muted">{L.biometricsUnavailable}</AppText>
            )}
          </Card>
          <Card>
            <AppText variant="label" tone="muted">
              {L.relock}
            </AppText>
            <ChipGroup
              value={config.relockMinutes}
              onChange={async (relockMinutes) => {
                await updateLockSettings({ relockMinutes });
                await load();
                await refresh();
              }}
              options={[0, 1, 5, 15].map((m) => ({ value: m, label: L.relockOptions[m] }))}
            />
          </Card>
        </>
      ) : null}

      <AppText variant="caption" tone="muted">
        {L.forgotHint}
      </AppText>
    </Screen>
  );
}

const styles = StyleSheet.create({
  center: { justifyContent: 'center', gap: spacing.xl },
  prompt: { alignItems: 'center', gap: spacing.md },
  msg: { minHeight: 22, textAlign: 'center' },
});
