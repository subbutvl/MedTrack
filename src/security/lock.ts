import * as Crypto from 'expo-crypto';
import { File, Paths } from 'expo-file-system';
import * as LocalAuthentication from 'expo-local-authentication';
import * as SecureStore from 'expo-secure-store';

import { hashPin, safeEqual, toBase64, fromBase64 } from '@/domain/backupCrypto';

const KEY = 'medtrack.lock';
const opts = { keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY };

export type LockConfig = {
  pinHash: string;
  salt: string;
  biometrics: boolean;
  relockMinutes: number;
  failedAttempts: number;
  lockedUntil: number;
};

export const MAX_ATTEMPTS = 5;
export const LOCKOUT_MS = 30_000;

/**
 * On iOS the Keychain keeps the PIN record after the app is uninstalled, so a reinstall would
 * still ask for the forgotten PIN and block the restore screen. The app's documents folder is
 * wiped on uninstall, so a missing marker file there means this is a fresh install: the old
 * PIN record is cleared and the marker is written.
 */
export async function clearLockAfterReinstall() {
  const marker = new File(Paths.document, 'medtrack-install');
  if (marker.exists) return;
  await SecureStore.deleteItemAsync(KEY);
  await marker.write(String(Date.now()));
}

export async function getLockConfig(): Promise<LockConfig | null> {
  const raw = await SecureStore.getItemAsync(KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as LockConfig;
  } catch {
    return null;
  }
}

async function save(c: LockConfig) {
  await SecureStore.setItemAsync(KEY, JSON.stringify(c), opts);
}

export async function setPin(pin: string, prev?: LockConfig | null) {
  const salt = Crypto.getRandomBytes(16);
  await save({
    pinHash: await hashPin(pin, salt),
    salt: toBase64(salt),
    biometrics: prev?.biometrics ?? false,
    relockMinutes: prev?.relockMinutes ?? 1,
    failedAttempts: 0,
    lockedUntil: 0,
  });
}

export async function removePin() {
  await SecureStore.deleteItemAsync(KEY);
}

export async function updateLockSettings(patch: Partial<Pick<LockConfig, 'biometrics' | 'relockMinutes'>>) {
  const c = await getLockConfig();
  if (c) await save({ ...c, ...patch });
}

export type PinResult = { ok: true } | { ok: false; lockedUntil: number; attemptsLeft: number };

/** Checks a PIN. After 5 wrong attempts, entry is blocked for 30 seconds. */
export async function verifyPin(pin: string): Promise<PinResult> {
  const c = await getLockConfig();
  if (!c) return { ok: true };
  if (Date.now() < c.lockedUntil) return { ok: false, lockedUntil: c.lockedUntil, attemptsLeft: 0 };
  const ok = safeEqual(await hashPin(pin, fromBase64(c.salt)), c.pinHash);
  if (ok) {
    await save({ ...c, failedAttempts: 0, lockedUntil: 0 });
    return { ok: true };
  }
  const failed = c.failedAttempts + 1;
  const lockedUntil = failed >= MAX_ATTEMPTS ? Date.now() + LOCKOUT_MS : 0;
  await save({ ...c, failedAttempts: failed >= MAX_ATTEMPTS ? 0 : failed, lockedUntil });
  return { ok: false, lockedUntil, attemptsLeft: failed >= MAX_ATTEMPTS ? 0 : MAX_ATTEMPTS - failed };
}

export async function biometricsAvailable(): Promise<boolean> {
  const [hw, enrolled] = await Promise.all([LocalAuthentication.hasHardwareAsync(), LocalAuthentication.isEnrolledAsync()]);
  return hw && enrolled;
}

export async function unlockWithBiometrics(prompt: string): Promise<boolean> {
  const r = await LocalAuthentication.authenticateAsync({ promptMessage: prompt, disableDeviceFallback: true, cancelLabel: 'Use PIN' });
  return r.success;
}
