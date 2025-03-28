import type { SQLiteDatabase } from 'expo-sqlite';
import type { Checkin, DayKey } from '@/types/habit';
import { placeholders } from './client';
import { enqueue } from './outbox';

type CheckinRow = {
  id: string;
  habit_id: string;
  day: string;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
};

function fromRow(row: CheckinRow): Checkin {
  return {
    id: row.id,
    habitId: row.habit_id,
    day: row.day,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    deletedAt: row.deleted_at,
  };
}

// Deterministic so that two devices checking in the same habit on the same day
// produce one row after sync instead of two.
export function checkinId(habitId: string, day: DayKey): string {
  return `${habitId}:${day}`;
}

export async function listCheckins(db: SQLiteDatabase): Promise<Checkin[]> {
  const rows = await db.getAllAsync<CheckinRow>(
    'SELECT * FROM checkins WHERE deleted_at IS NULL ORDER BY day',
  );
  return rows.map(fromRow);
}

export async function getCheckin(db: SQLiteDatabase, id: string): Promise<Checkin | null> {
  const row = await db.getFirstAsync<CheckinRow>('SELECT * FROM checkins WHERE id = ?', [id]);
  return row ? fromRow(row) : null;
}

export async function getCheckinsByIds(db: SQLiteDatabase, ids: string[]): Promise<Checkin[]> {
  if (ids.length === 0) return [];
  const rows = await db.getAllAsync<CheckinRow>(
    `SELECT * FROM checkins WHERE id IN (${placeholders(ids.length)})`,
    ids,
  );
  return rows.map(fromRow);
}

export async function upsertCheckin(db: SQLiteDatabase, checkin: Checkin): Promise<void> {
  await db.runAsync(
    `INSERT INTO checkins (id, habit_id, day, created_at, updated_at, deleted_at)
     VALUES (?, ?, ?, ?, ?, ?)
     ON CONFLICT (id) DO UPDATE SET
       habit_id = excluded.habit_id,
       day = excluded.day,
       created_at = excluded.created_at,
       updated_at = excluded.updated_at,
       deleted_at = excluded.deleted_at`,
    [
      checkin.id,
      checkin.habitId,
      checkin.day,
      checkin.createdAt,
      checkin.updatedAt,
      checkin.deletedAt,
    ],
  );
}

export async function saveCheckin(db: SQLiteDatabase, checkin: Checkin): Promise<void> {
  await db.withTransactionAsync(async () => {
    await upsertCheckin(db, checkin);
    await enqueue(db, 'checkin', checkin.id, checkin);
  });
}
