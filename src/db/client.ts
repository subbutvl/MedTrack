import * as Crypto from 'expo-crypto';
import * as SecureStore from 'expo-secure-store';
import * as SQLite from 'expo-sqlite';

import { migrations } from './schema';

const DB_NAME = 'medtrack.db';
const KEY_NAME = 'medtrack.db.key';

/** The 256-bit key is random, generated on first launch, and kept in the Keychain or Keystore. */
async function getOrCreateKey(): Promise<string> {
  const existing = await SecureStore.getItemAsync(KEY_NAME);
  if (existing) return existing;
  const bytes = Crypto.getRandomBytes(32);
  const hex = Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
  await SecureStore.setItemAsync(KEY_NAME, hex, { keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY });
  return hex;
}

let dbPromise: Promise<SQLite.SQLiteDatabase> | null = null;

/** Opens the SQLCipher-encrypted database and runs any pending migrations. */
export function getDb(): Promise<SQLite.SQLiteDatabase> {
  if (!dbPromise) {
    dbPromise = (async () => {
      const db = await SQLite.openDatabaseAsync(DB_NAME);
      const key = await getOrCreateKey();
      // The key must be set before any other statement. It needs `useSQLCipher: true` in app.json.
      await db.execAsync(`PRAGMA key = "x'${key}'";`);
      await db.execAsync('PRAGMA foreign_keys = ON; PRAGMA journal_mode = WAL;');
      await migrate(db);
      return db;
    })();
  }
  return dbPromise;
}

async function migrate(db: SQLite.SQLiteDatabase) {
  const row = await db.getFirstAsync<{ user_version: number }>('PRAGMA user_version');
  let version = row?.user_version ?? 0;
  while (version < migrations.length) {
    await db.withExclusiveTransactionAsync(async (tx) => {
      await tx.execAsync(migrations[version]);
    });
    version += 1;
    await db.execAsync(`PRAGMA user_version = ${version}`);
  }
}

/** Ensures the "Me" profile exists. Phase 1 is Personal only. */
export async function ensureSelfProfile(name = 'Me') {
  const db = await getDb();
  const me = await db.getFirstAsync<{ id: string }>('SELECT id FROM person WHERE is_self = 1 AND deleted = 0');
  if (me) return me.id;
  const id = Crypto.randomUUID();
  await db.runAsync('INSERT INTO person (id, name, is_self) VALUES (?, ?, 1)', id, name);
  return id;
}
