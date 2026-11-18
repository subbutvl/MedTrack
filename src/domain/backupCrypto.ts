import { gcm } from '@noble/ciphers/aes.js';
import { scryptAsync } from '@noble/hashes/scrypt.js';

/**
 * Backup file format (JSON):
 *   { format: 'medtrack-backup', v: 1, kdf: { alg: 'scrypt', N, r, p, salt }, nonce, ct }
 * The key comes from the user's passphrase through scrypt, and the payload is sealed with
 * AES-256-GCM. GCM's auth tag means a wrong passphrase or a tampered file fails cleanly.
 */
export const BACKUP_FORMAT = 'medtrack-backup';
export const BACKUP_VERSION = 1;
const KDF = { N: 2 ** 15, r: 8, p: 1 };

export type BackupEnvelope = {
  format: typeof BACKUP_FORMAT;
  v: number;
  kdf: { alg: 'scrypt'; N: number; r: number; p: number; salt: string };
  nonce: string;
  ct: string;
};

export class BackupError extends Error {
  constructor(
    public code: 'not_a_backup' | 'unsupported_version' | 'wrong_passphrase',
    message: string,
  ) {
    super(message);
  }
}

export const MIN_PASSPHRASE = 8;

const enc = new TextEncoder();
const dec = new TextDecoder();

export function toBase64(bytes: Uint8Array): string {
  let s = '';
  for (let i = 0; i < bytes.length; i += 0x8000) s += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  return btoa(s);
}

export function fromBase64(b64: string): Uint8Array {
  const s = atob(b64);
  const out = new Uint8Array(s.length);
  for (let i = 0; i < s.length; i++) out[i] = s.charCodeAt(i);
  return out;
}

export async function sealBackup(
  plaintext: string,
  passphrase: string,
  random: (n: number) => Uint8Array,
  kdf: { N: number; r: number; p: number } = KDF,
): Promise<BackupEnvelope> {
  const salt = random(16);
  const nonce = random(12);
  const key = await scryptAsync(enc.encode(passphrase), salt, { ...kdf, dkLen: 32 });
  const ct = gcm(key, nonce).encrypt(enc.encode(plaintext));
  return {
    format: BACKUP_FORMAT,
    v: BACKUP_VERSION,
    kdf: { alg: 'scrypt', ...kdf, salt: toBase64(salt) },
    nonce: toBase64(nonce),
    ct: toBase64(ct),
  };
}

export async function openBackup(fileText: string, passphrase: string): Promise<string> {
  let env: BackupEnvelope;
  try {
    env = JSON.parse(fileText);
  } catch {
    throw new BackupError('not_a_backup', 'This file is not a MedTrack backup.');
  }
  if (env?.format !== BACKUP_FORMAT || !env.kdf || !env.ct) throw new BackupError('not_a_backup', 'This file is not a MedTrack backup.');
  if (env.v > BACKUP_VERSION) throw new BackupError('unsupported_version', 'This backup was made by a newer version of MedTrack.');
  const { N, r, p, salt } = env.kdf;
  // Refuse KDF settings beyond a phone-safe cap (at most 64 MiB of scrypt memory, twice the work
  // this app writes), so a crafted file can't stall or crash the phone.
  if (!(N >= 2 ** 10 && N <= 2 ** 16 && r >= 1 && r <= 8 && p === 1)) throw new BackupError('not_a_backup', 'This file is not a MedTrack backup.');
  const key = await scryptAsync(enc.encode(passphrase), fromBase64(salt), { N, r, p, dkLen: 32 });
  try {
    return dec.decode(gcm(key, fromBase64(env.nonce)).decrypt(fromBase64(env.ct)));
  } catch {
    throw new BackupError('wrong_passphrase', 'Wrong passphrase, or the file is damaged.');
  }
}

/** PIN hashing. The PIN never leaves the device, and only a salted scrypt hash is kept, in secure storage. */
export async function hashPin(pin: string, salt: Uint8Array): Promise<string> {
  return toBase64(await scryptAsync(enc.encode(pin), salt, { N: 2 ** 13, r: 8, p: 1, dkLen: 32 }));
}

/** Constant-time comparison for equal-length strings. */
export function safeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}
