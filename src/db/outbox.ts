import type { SQLiteDatabase } from 'expo-sqlite';
import type { EntityName } from '@/types/habit';
import { placeholders } from './client';

export interface OutboxItem {
  id: number;
  entity: EntityName;
  entityId: string;
  payload: string;
  attempts: number;
}

type OutboxRow = {
  id: number;
  entity: EntityName;
  entity_id: string;
  payload: string;
  attempts: number;
};

// Payload is the full record, so only the latest version per entity needs to be sent.
//
// REPLACE (delete + insert) rather than ON CONFLICT DO UPDATE on purpose: the new row
// gets a fresh id. If a push carrying the old row is in flight, the engine removes the
// old id when it succeeds, and this newer edit stays queued instead of being dropped.
export async function enqueue(
  db: SQLiteDatabase,
  entity: EntityName,
  entityId: string,
  record: unknown,
): Promise<void> {
  await db.runAsync(
    `INSERT OR REPLACE INTO outbox (entity, entity_id, payload, created_at, attempts)
     VALUES (?, ?, ?, ?, 0)`,
    [entity, entityId, JSON.stringify(record), new Date().toISOString()],
  );
}

export async function peekOutbox(
  db: SQLiteDatabase,
  limit: number,
  maxAttempts: number,
): Promise<OutboxItem[]> {
  const rows = await db.getAllAsync<OutboxRow>(
    'SELECT id, entity, entity_id, payload, attempts FROM outbox WHERE attempts < ? ORDER BY id LIMIT ?',
    [maxAttempts, limit],
  );
  return rows.map((r) => ({
    id: r.id,
    entity: r.entity,
    entityId: r.entity_id,
    payload: r.payload,
    attempts: r.attempts,
  }));
}

export async function removeOutbox(db: SQLiteDatabase, ids: number[]): Promise<void> {
  if (ids.length === 0) return;
  await db.runAsync(`DELETE FROM outbox WHERE id IN (${placeholders(ids.length)})`, ids);
}

export async function markOutboxFailed(
  db: SQLiteDatabase,
  ids: number[],
  error: string,
): Promise<void> {
  if (ids.length === 0) return;
  await db.runAsync(
    `UPDATE outbox SET attempts = attempts + 1, last_error = ? WHERE id IN (${placeholders(ids.length)})`,
    [error, ...ids],
  );
}

export async function outboxCounts(
  db: SQLiteDatabase,
  maxAttempts: number,
): Promise<{ pending: number; failed: number }> {
  const row = await db.getFirstAsync<{ pending: number | null; failed: number | null }>(
    `SELECT
       SUM(CASE WHEN attempts < ? THEN 1 ELSE 0 END) AS pending,
       SUM(CASE WHEN attempts >= ? THEN 1 ELSE 0 END) AS failed
     FROM outbox`,
    [maxAttempts, maxAttempts],
  );
  return { pending: row?.pending ?? 0, failed: row?.failed ?? 0 };
}

export async function resetFailed(db: SQLiteDatabase): Promise<void> {
  await db.runAsync('UPDATE outbox SET attempts = 0, last_error = NULL WHERE attempts > 0');
}
