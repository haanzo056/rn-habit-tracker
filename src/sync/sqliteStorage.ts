import type { SQLiteDatabase } from 'expo-sqlite';
import { getCheckinsByIds, upsertCheckin } from '@/db/checkins';
import { getHabitsByIds, upsertHabit } from '@/db/habits';
import { markOutboxFailed, peekOutbox, removeOutbox } from '@/db/outbox';
import { getSyncValue, setSyncValue } from '@/db/syncState';
import type { Checkin, Habit } from '@/types/habit';
import { MAX_ATTEMPTS, type SyncStorage } from './engine';

const CURSOR_KEY = 'pull_cursor';

export function createSqliteSyncStorage(getDb: () => Promise<SQLiteDatabase>): SyncStorage {
  return {
    async peekOutbox(limit) {
      return peekOutbox(await getDb(), limit, MAX_ATTEMPTS);
    },
    async removeOutbox(ids) {
      await removeOutbox(await getDb(), ids);
    },
    async markOutboxFailed(ids, error) {
      await markOutboxFailed(await getDb(), ids, error);
    },
    async getCursor() {
      return getSyncValue(await getDb(), CURSOR_KEY);
    },
    async getLocal(entity, ids) {
      const db = await getDb();
      const rows: (Habit | Checkin)[] =
        entity === 'habit' ? await getHabitsByIds(db, ids) : await getCheckinsByIds(db, ids);
      return new Map(rows.map((r) => [r.id, r]));
    },
    async applyRemote(changes, cursor) {
      const db = await getDb();
      await db.withTransactionAsync(async () => {
        for (const change of changes) {
          if (change.entity === 'habit') await upsertHabit(db, change.record);
          else await upsertCheckin(db, change.record);
        }
        await setSyncValue(db, CURSOR_KEY, cursor);
      });
    },
  };
}
