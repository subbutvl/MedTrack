import * as Crypto from 'expo-crypto';
import * as DocumentPicker from 'expo-document-picker';
import { File, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';

import { getDb } from '@/db/client';
import { notifyChange } from '@/db/events';
import { openBackup, sealBackup } from '@/domain/backupCrypto';
import { localToday } from '@/domain/dates';

/** Tables in parent-to-child order. Restore deletes in reverse order and inserts in this order. */
const TABLES = [
  'settings',
  'person',
  'doctor',
  'person_doctor',
  'stock_item',
  'medication',
  'dose_event',
  'checkup',
  'checkup_visit',
  'reading',
  'side_effect',
] as const;

type Dump = { app: 'medtrack'; schemaVersion: number; exportedAt: string; tables: Record<string, Record<string, unknown>[]> };

async function dump(): Promise<Dump> {
  const db = await getDb();
  const version = (await db.getFirstAsync<{ user_version: number }>('PRAGMA user_version'))?.user_version ?? 0;
  const tables: Dump['tables'] = {};
  for (const t of TABLES) tables[t] = await db.getAllAsync<Record<string, unknown>>(`SELECT * FROM ${t}`);
  return { app: 'medtrack', schemaVersion: version, exportedAt: new Date().toISOString(), tables };
}

/** Builds the encrypted backup and opens the share sheet, so it can be saved to Drive, Files, WhatsApp or similar. */
export async function exportBackup(passphrase: string): Promise<void> {
  const payload = JSON.stringify(await dump());
  const envelope = await sealBackup(payload, passphrase, (n) => Crypto.getRandomBytes(n));
  const file = new File(Paths.cache, `MedTrack-backup-${localToday()}.medbak`);
  if (file.exists) file.delete();
  file.create();
  await file.write(JSON.stringify(envelope));
  await Sharing.shareAsync(file.uri, { mimeType: 'application/octet-stream', dialogTitle: 'Save MedTrack backup' });
}

/** Lets the user pick a backup file and returns its text, or null if they cancel. */
export async function pickBackupFile(): Promise<{ name: string; text: string } | null> {
  const res = await DocumentPicker.getDocumentAsync({ copyToCacheDirectory: true, multiple: false, type: '*/*' });
  if (res.canceled || !res.assets?.[0]) return null;
  const asset = res.assets[0];
  return { name: asset.name, text: await new File(asset.uri).text() };
}

export type RestoreSummary = { people: number; medicines: number; exportedAt: string };

/** Decrypts and checks a backup without changing anything. Throws BackupError on a wrong passphrase. */
export async function readBackup(fileText: string, passphrase: string): Promise<{ dump: Dump; summary: RestoreSummary }> {
  const parsed = JSON.parse(await openBackup(fileText, passphrase)) as Dump;
  if (parsed?.app !== 'medtrack' || typeof parsed.tables !== 'object') throw new Error('This file is not a MedTrack backup.');
  const db = await getDb();
  const current = (await db.getFirstAsync<{ user_version: number }>('PRAGMA user_version'))?.user_version ?? 0;
  if (parsed.schemaVersion > current) throw new Error('This backup was made by a newer version of MedTrack. Update the app first.');
  return {
    dump: parsed,
    summary: {
      people: (parsed.tables.person ?? []).filter((p) => !p.deleted).length,
      medicines: (parsed.tables.medication ?? []).filter((m) => !m.deleted).length,
      exportedAt: parsed.exportedAt,
    },
  };
}

/** Replaces everything on this phone with the backup's contents, in one transaction. */
export async function restoreBackup(d: Dump): Promise<void> {
  const db = await getDb();
  await db.withExclusiveTransactionAsync(async (tx) => {
    for (const t of [...TABLES].reverse()) await tx.runAsync(`DELETE FROM ${t}`);
    for (const t of TABLES) {
      const cols = new Set((await tx.getAllAsync<{ name: string }>(`PRAGMA table_info(${t})`)).map((c) => c.name));
      for (const row of d.tables[t] ?? []) {
        const keys = Object.keys(row).filter((k) => cols.has(k));
        if (!keys.length) continue;
        await tx.runAsync(
          `INSERT INTO ${t} (${keys.join(', ')}) VALUES (${keys.map(() => '?').join(', ')})`,
          keys.map((k) => row[k] as string | number | null),
        );
      }
    }
  });
  notifyChange();
}
