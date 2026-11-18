import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from 'react';
import { AppState, Modal } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { getLockConfig } from './lock';
import { LockScreen } from './LockScreen';

type LockContext = { refresh: () => Promise<void>; enabled: boolean };
const Ctx = createContext<LockContext>({ refresh: async () => {}, enabled: false });

/**
 * Covers the whole app with the lock screen at launch, and again when the app returns
 * from the background after the re-lock delay, whenever a PIN is set.
 */
export function LockProvider({ children }: { children: ReactNode }) {
  const [ready, setReady] = useState(false);
  const [enabled, setEnabled] = useState(false);
  const [locked, setLocked] = useState(false);
  const [biometrics, setBiometrics] = useState(false);
  const relockMs = useRef(60_000);
  const backgroundedAt = useRef<number | null>(null);

  const refresh = useCallback(async () => {
    const c = await getLockConfig();
    setEnabled(!!c);
    setBiometrics(!!c?.biometrics);
    relockMs.current = (c?.relockMinutes ?? 1) * 60_000;
  }, []);

  useEffect(() => {
    (async () => {
      const c = await getLockConfig();
      setEnabled(!!c);
      setBiometrics(!!c?.biometrics);
      relockMs.current = (c?.relockMinutes ?? 1) * 60_000;
      setLocked(!!c);
      setReady(true);
    })();
  }, []);

  useEffect(() => {
    const sub = AppState.addEventListener('change', (s) => {
      if (s === 'background') backgroundedAt.current = Date.now();
      if (s === 'active' && enabled && backgroundedAt.current != null) {
        if (Date.now() - backgroundedAt.current >= relockMs.current) setLocked(true);
        backgroundedAt.current = null;
      }
    });
    return () => sub.remove();
  }, [enabled]);

  if (!ready) return null;

  return (
    <Ctx.Provider value={{ refresh, enabled }}>
      {children}
      {/* A Modal sits above everything, including screens presented as native modals. */}
      <Modal visible={locked} animationType="none" statusBarTranslucent navigationBarTranslucent onRequestClose={() => {}}>
        <SafeAreaProvider>
          <LockScreen biometrics={biometrics} onUnlock={() => setLocked(false)} />
        </SafeAreaProvider>
      </Modal>
    </Ctx.Provider>
  );
}

export const useLock = () => useContext(Ctx);
