import type { SQLiteDatabase } from 'expo-sqlite';
import type { Habit, Schedule } from '@/types/habit';
import { placeholders } from './client';
import { enqueue } from './outbox';

type HabitRow = {
  id: string;
  name: string;
  color: string;
  schedule: string;
  reminder_time: string | null;
  archived: number;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
};

function fromRow(row: HabitRow): Habit {
  return {
    id: row.id,
    name: row.name,
    color: row.color,
    schedule: JSON.parse(row.schedule) as Schedule,
    reminderTime: row.reminder_time,
    archived: row.archived === 1,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    deletedAt: row.deleted_at,
  };
}

export async function listHabits(db: SQLiteDatabase): Promise<Habit[]> {
  const rows = await db.getAllAsync<HabitRow>(
    'SELECT * FROM habits WHERE deleted_at IS NULL ORDER BY created_at',
  );
  return rows.map(fromRow);
}

export async function getHabitsByIds(db: SQLiteDatabase, ids: string[]): Promise<Habit[]> {
  if (ids.length === 0) return [];
  const rows = await db.getAllAsync<HabitRow>(
    `SELECT * FROM habits WHERE id IN (${placeholders(ids.length)})`,
    ids,
  );
  return rows.map(fromRow);
}

export async function upsertHabit(db: SQLiteDatabase, habit: Habit): Promise<void> {
  await db.runAsync(
    `INSERT INTO habits (id, name, color, schedule, reminder_time, archived, created_at, updated_at, deleted_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
     ON CONFLICT (id) DO UPDATE SET
       name = excluded.name,
       color = excluded.color,
       schedule = excluded.schedule,
       reminder_time = excluded.reminder_time,
       archived = excluded.archived,
       created_at = excluded.created_at,
       updated_at = excluded.updated_at,
       deleted_at = excluded.deleted_at`,
    [
      habit.id,
      habit.name,
      habit.color,
      JSON.stringify(habit.schedule),
      habit.reminderTime,
      habit.archived ? 1 : 0,
      habit.createdAt,
      habit.updatedAt,
      habit.deletedAt,
    ],
  );
}

// TODO: withTransactionAsync isn't isolated from other queries running on the same
// connection. Good enough while all writes go through the store one at a time.
export async function saveHabit(db: SQLiteDatabase, habit: Habit): Promise<void> {
  await db.withTransactionAsync(async () => {
    await upsertHabit(db, habit);
    await enqueue(db, 'habit', habit.id, habit);
  });
}
