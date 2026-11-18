// eslint-disable-next-line @typescript-eslint/no-require-imports
const { randomBytes } = require('crypto') as { randomBytes: (n: number) => Uint8Array };

import { BackupError, fromBase64, hashPin, openBackup, safeEqual, sealBackup, toBase64 } from '../backupCrypto';

const rnd = (n: number) => new Uint8Array(randomBytes(n));
const fastKdf = { N: 2 ** 10, r: 8, p: 1 };

describe('backup crypto', () => {
  it('round-trips with the right passphrase', async () => {
    const payload = JSON.stringify({ person: [{ id: 'a', name: 'Amma' }], note: 'ünïcødé ✓' });
    const env = await sealBackup(payload, 'correct horse', rnd, fastKdf);
    expect(env.format).toBe('medtrack-backup');
    expect(env.ct).not.toContain('Amma');
    await expect(openBackup(JSON.stringify(env), 'correct horse')).resolves.toBe(payload);
  });

  it('rejects a wrong passphrase, a tampered file and non-backups', async () => {
    const env = await sealBackup('secret', 'pass phrase', rnd, fastKdf);
    await expect(openBackup(JSON.stringify(env), 'nope nope')).rejects.toThrow(BackupError);
    const ct = fromBase64(env.ct);
    ct[0] ^= 1;
    await expect(openBackup(JSON.stringify({ ...env, ct: toBase64(ct) }), 'pass phrase')).rejects.toThrow(/Wrong passphrase/);
    await expect(openBackup('hello', 'x')).rejects.toThrow(/not a MedTrack backup/);
    await expect(openBackup(JSON.stringify({ ...env, v: 99 }), 'pass phrase')).rejects.toThrow(/newer version/);
  });

  it('hashes PINs with a salt and compares safely', async () => {
    const salt = rnd(16);
    const h = await hashPin('1234', salt);
    expect(safeEqual(h, await hashPin('1234', salt))).toBe(true);
    expect(safeEqual(h, await hashPin('1235', salt))).toBe(false);
    expect(h).not.toBe(await hashPin('1234', rnd(16)));
  });
});
