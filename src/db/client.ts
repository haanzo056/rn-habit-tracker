import * as SQLite from 'expo-sqlite';
import { migrate } from './migrations';

let ready: Promise<SQLite.SQLiteDatabase> | null = null;

export function getDb(): Promise<SQLite.SQLiteDatabase> {
  if (!ready) {
    ready = (async () => {
      const db = await SQLite.openDatabaseAsync('streaks.db');
      await db.execAsync('PRAGMA journal_mode = WAL;');
      await migrate(db);
      return db;
    })().catch((err) => {
      ready = null;
      throw err;
    });
  }
  return ready;
}

export function placeholders(count: number): string {
  return new Array(count).fill('?').join(', ');
}
