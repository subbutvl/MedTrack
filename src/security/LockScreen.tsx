import { useCallback, useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AppText } from '@/components/AppText';
import { strings } from '@/i18n/strings';
import { spacing, useTheme } from '@/theme';
import { unlockWithBiometrics, verifyPin } from './lock';
import { PIN_LENGTH, PinDots, PinPad } from './PinPad';

export function LockScreen({ biometrics, onUnlock }: { biometrics: boolean; onUnlock: () => void }) {
  const { colors } = useTheme();
  const L = strings.lock;
  const [pin, setPin] = useState('');
  const [message, setMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [blockedUntil, setBlockedUntil] = useState(0);
  const [, tick] = useState(0);

  const tryBiometrics = useCallback(async () => {
    if (await unlockWithBiometrics(L.biometricPrompt)) onUnlock();
  }, [L.biometricPrompt, onUnlock]);

  useEffect(() => {
    if (biometrics) tryBiometrics();
  }, [biometrics, tryBiometrics]);

  useEffect(() => {
    if (!blockedUntil) return;
    const t = setInterval(() => (Date.now() >= blockedUntil ? (setBlockedUntil(0), setMessage(null)) : tick((x) => x + 1)), 1000);
    return () => clearInterval(t);
  }, [blockedUntil]);

  const onChange = async (v: string) => {
    setPin(v);
    if (v.length < PIN_LENGTH) return;
    setBusy(true);
    const r = await verifyPin(v);
    setBusy(false);
    setPin('');
    if (r.ok) return onUnlock();
    if (r.lockedUntil) {
      setBlockedUntil(r.lockedUntil);
      setMessage(L.tooMany);
    } else setMessage(L.wrong(r.attemptsLeft));
  };

  const secondsLeft = blockedUntil ? Math.max(0, Math.ceil((blockedUntil - Date.now()) / 1000)) : 0;

  return (
    <SafeAreaView style={[styles.root, { backgroundColor: colors.background }]}>
      <View style={styles.top}>
        <AppText variant="display">{strings.appName}</AppText>
        <AppText tone="muted">{L.enterPin}</AppText>
        <PinDots length={pin.length} />
        <AppText tone={blockedUntil ? 'danger' : 'muted'} style={styles.msg}>
          {blockedUntil ? `${message} ${L.tryAgainIn(secondsLeft)}` : (message ?? ' ')}
        </AppText>
      </View>
      <PinPad
        value={pin}
        onChange={onChange}
        disabled={busy || !!blockedUntil}
        extra={biometrics ? { icon: 'finger-print', label: L.useBiometrics, onPress: tryBiometrics } : undefined}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, justifyContent: 'space-evenly', padding: spacing.lg },
  top: { alignItems: 'center', gap: spacing.md },
  msg: { textAlign: 'center', minHeight: 22 },
});
