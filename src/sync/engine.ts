import type { OutboxItem } from '@/db/outbox';
import type { Checkin, EntityName, Habit } from '@/types/habit';
import { HttpError, type ChangeSet, type SyncApi } from './api';
import { shouldApplyRemote } from './merge';

export const MAX_ATTEMPTS = 5;
const PUSH_BATCH = 100;

export type RemoteChange =
  { entity: 'habit'; record: Habit } | { entity: 'checkin'; record: Checkin };

export interface SyncStorage {
  peekOutbox(limit: number): Promise<OutboxItem[]>;
  removeOutbox(ids: number[]): Promise<void>;
  markOutboxFailed(ids: number[], error: string): Promise<void>;
  getCursor(): Promise<string | null>;
  getLocal(entity: EntityName, ids: string[]): Promise<Map<string, Habit | Checkin>>;
  // Must write the changes and the new cursor atomically, otherwise a crash between
  // the two either skips a page or re-applies it on top of newer local edits.
  applyRemote(changes: RemoteChange[], cursor: string): Promise<void>;
}

export interface SyncResult {
  pushed: number;
  pulled: number;
}

export interface SyncEngine {
  sync(): Promise<SyncResult>;
}

export function createSyncEngine(api: SyncApi, storage: SyncStorage): SyncEngine {
  let inFlight: Promise<SyncResult> | null = null;

  async function push(): Promise<number> {
    let pushed = 0;
    for (;;) {
      const items = await storage.peekOutbox(PUSH_BATCH);
      if (items.length === 0) return pushed;

      const changes: ChangeSet = { habits: [], checkins: [] };
      for (const item of items) {
        if (item.entity === 'habit') changes.habits.push(JSON.parse(item.payload) as Habit);
        else changes.checkins.push(JSON.parse(item.payload) as Checkin);
      }

      const ids = items.map((i) => i.id);
      try {
        await api.push(changes);
      } catch (err) {
        // Network errors and 5xx are retried forever. A 4xx means the server won't
        // accept this batch as is, so count it against the items.
        // FIXME: one bad record fails the whole batch; the server should report per-record.
        if (err instanceof HttpError && !err.retryable) {
          await storage.markOutboxFailed(ids, err.message);
        }
        throw err;
      }
      await storage.removeOutbox(ids);
      pushed += items.length;
    }
  }

  async function newerThanLocal<T extends Habit | Checkin>(
    entity: EntityName,
    records: T[],
  ): Promise<T[]> {
    if (records.length === 0) return [];
    const locals = await storage.getLocal(
      entity,
      records.map((r) => r.id),
    );
    return records.filter((r) => shouldApplyRemote(locals.get(r.id) ?? null, r));
  }

  async function pull(): Promise<number> {
    let cursor = await storage.getCursor();
    let pulled = 0;
    for (;;) {
      const page = await api.pull(cursor);
      const habits = await newerThanLocal('habit', page.habits);
      const checkins = await newerThanLocal('checkin', page.checkins);
      const changes: RemoteChange[] = [
        ...habits.map((record) => ({ entity: 'habit' as const, record })),
        ...checkins.map((record) => ({ entity: 'checkin' as const, record })),
      ];
      await storage.applyRemote(changes, page.cursor);
      pulled += changes.length;
      if (!page.hasMore || page.cursor === cursor) return pulled;
      cursor = page.cursor;
    }
  }

  // Push first so the server has our edits before we ask for changes; otherwise a
  // stale remote copy could come back and win against an edit that hasn't left yet.
  async function run(): Promise<SyncResult> {
    const pushed = await push();
    const pulled = await pull();
    return { pushed, pulled };
  }

  return {
    sync() {
      if (!inFlight) {
        inFlight = run().finally(() => {
          inFlight = null;
        });
      }
      return inFlight;
    },
  };
}

export function backoffDelay(failures: number, baseMs = 5_000, maxMs = 5 * 60_000): number {
  if (failures <= 0) return 0;
  return Math.min(maxMs, baseMs * 2 ** (failures - 1));
}
