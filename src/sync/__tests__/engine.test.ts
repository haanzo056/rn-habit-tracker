import type { OutboxItem } from '@/db/outbox';
import type { Checkin, EntityName, Habit } from '@/types/habit';
import { HttpError, type ChangeSet, type PullResponse, type SyncApi } from '../api';
import {
  MAX_ATTEMPTS,
  backoffDelay,
  createSyncEngine,
  type RemoteChange,
  type SyncStorage,
} from '../engine';

function habit(id: string, updatedAt: string, patch: Partial<Habit> = {}): Habit {
  return {
    id,
    name: id,
    color: '#000000',
    schedule: { type: 'daily' },
    reminderTime: null,
    archived: false,
    createdAt: '2024-06-01T00:00:00.000Z',
    updatedAt,
    deletedAt: null,
    ...patch,
  };
}

function checkin(habitId: string, day: string, updatedAt: string): Checkin {
  return {
    id: `${habitId}:${day}`,
    habitId,
    day,
    createdAt: updatedAt,
    updatedAt,
    deletedAt: null,
  };
}

// Mirrors the SQLite implementation closely enough, including INSERT OR REPLACE
// giving a re-enqueued entity a new outbox id.
class MemoryStorage implements SyncStorage {
  habits = new Map<string, Habit>();
  checkins = new Map<string, Checkin>();
  outbox: (OutboxItem & { lastError?: string })[] = [];
  cursor: string | null = null;
  private nextId = 1;

  enqueue(entity: EntityName, record: Habit | Checkin) {
    this.outbox = this.outbox.filter((i) => !(i.entity === entity && i.entityId === record.id));
    this.outbox.push({
      id: this.nextId++,
      entity,
      entityId: record.id,
      payload: JSON.stringify(record),
      attempts: 0,
    });
  }

  async peekOutbox(limit: number) {
    return this.outbox.filter((i) => i.attempts < MAX_ATTEMPTS).slice(0, limit);
  }

  async removeOutbox(ids: number[]) {
    this.outbox = this.outbox.filter((i) => !ids.includes(i.id));
  }

  async markOutboxFailed(ids: number[], error: string) {
    for (const item of this.outbox) {
      if (ids.includes(item.id)) {
        item.attempts++;
        item.lastError = error;
      }
    }
  }

  async getCursor() {
    return this.cursor;
  }

  async getLocal(entity: EntityName, ids: string[]) {
    const table: Map<string, Habit | Checkin> = entity === 'habit' ? this.habits : this.checkins;
    const found = new Map<string, Habit | Checkin>();
    for (const id of ids) {
      const row = table.get(id);
      if (row) found.set(id, row);
    }
    return found;
  }

  async applyRemote(changes: RemoteChange[], cursor: string) {
    for (const c of changes) {
      if (c.entity === 'habit') this.habits.set(c.record.id, c.record);
      else this.checkins.set(c.record.id, c.record);
    }
    this.cursor = cursor;
  }
}

function fakeApi(pages: PullResponse[] = []) {
  const pushed: ChangeSet[] = [];
  const pullCursors: (string | null)[] = [];
  const api: SyncApi & { pushed: ChangeSet[]; pullCursors: (string | null)[] } = {
    pushed,
    pullCursors,
    push: jest.fn(async (changes: ChangeSet) => {
      pushed.push(changes);
    }),
    pull: jest.fn(async (cursor: string | null) => {
      pullCursors.push(cursor);
      return pages.shift() ?? { habits: [], checkins: [], cursor: cursor ?? '0', hasMore: false };
    }),
  };
  return api;
}

describe('push', () => {
  it('sends queued records and clears the outbox', async () => {
    const storage = new MemoryStorage();
    storage.enqueue('habit', habit('h1', '2024-06-01T10:00:00.000Z'));
    storage.enqueue('checkin', checkin('h1', '2024-06-01', '2024-06-01T10:01:00.000Z'));
    const api = fakeApi();

    const result = await createSyncEngine(api, storage).sync();

    expect(result.pushed).toBe(2);
    expect(api.pushed).toHaveLength(1);
    expect(api.pushed[0]!.habits.map((h) => h.id)).toEqual(['h1']);
    expect(api.pushed[0]!.checkins.map((c) => c.id)).toEqual(['h1:2024-06-01']);
    expect(storage.outbox).toHaveLength(0);
  });

  it('only sends the latest version of a record', async () => {
    const storage = new MemoryStorage();
    storage.enqueue('habit', habit('h1', '2024-06-01T10:00:00.000Z', { name: 'old' }));
    storage.enqueue('habit', habit('h1', '2024-06-01T10:05:00.000Z', { name: 'new' }));
    const api = fakeApi();

    await createSyncEngine(api, storage).sync();

    expect(api.pushed[0]!.habits).toEqual([expect.objectContaining({ name: 'new' })]);
  });

  it('keeps the outbox when the network fails', async () => {
    const storage = new MemoryStorage();
    storage.enqueue('habit', habit('h1', '2024-06-01T10:00:00.000Z'));
    const api = fakeApi();
    (api.push as jest.Mock).mockRejectedValueOnce(new TypeError('Network request failed'));

    await expect(createSyncEngine(api, storage).sync()).rejects.toThrow('Network request failed');
    expect(storage.outbox).toHaveLength(1);
    expect(storage.outbox[0]!.attempts).toBe(0);
    expect(api.pull).not.toHaveBeenCalled();
  });

  it('counts attempts on non-retryable errors and eventually gives up', async () => {
    const storage = new MemoryStorage();
    storage.enqueue('habit', habit('h1', '2024-06-01T10:00:00.000Z'));
    const api = fakeApi();
    (api.push as jest.Mock).mockRejectedValue(new HttpError(400, 'bad request'));
    const engine = createSyncEngine(api, storage);

    for (let i = 0; i < MAX_ATTEMPTS; i++) {
      await expect(engine.sync()).rejects.toBeInstanceOf(HttpError);
    }
    expect(storage.outbox[0]!.attempts).toBe(MAX_ATTEMPTS);

    // Dead-lettered item is skipped, so sync goes through
    await expect(engine.sync()).resolves.toEqual({ pushed: 0, pulled: 0 });
  });

  it('does not count 5xx against the item', async () => {
    const storage = new MemoryStorage();
    storage.enqueue('habit', habit('h1', '2024-06-01T10:00:00.000Z'));
    const api = fakeApi();
    (api.push as jest.Mock).mockRejectedValueOnce(new HttpError(503, 'unavailable'));

    await expect(createSyncEngine(api, storage).sync()).rejects.toThrow('unavailable');
    expect(storage.outbox[0]!.attempts).toBe(0);
  });

  it('does not drop an edit made while a push is in flight', async () => {
    const storage = new MemoryStorage();
    storage.enqueue('habit', habit('h1', '2024-06-01T10:00:00.000Z', { name: 'first' }));
    const api = fakeApi();
    let pushes = 0;
    (api.push as jest.Mock).mockImplementation(async (changes: ChangeSet) => {
      api.pushed.push(changes);
      if (pushes++ === 0) {
        storage.enqueue('habit', habit('h1', '2024-06-01T10:00:05.000Z', { name: 'second' }));
      }
    });

    const result = await createSyncEngine(api, storage).sync();

    expect(result.pushed).toBe(2);
    expect(api.pushed.map((c) => c.habits[0]!.name)).toEqual(['first', 'second']);
    expect(storage.outbox).toHaveLength(0);
  });
});

describe('pull', () => {
  it('follows pages and stores the cursor', async () => {
    const storage = new MemoryStorage();
    const api = fakeApi([
      {
        habits: [habit('h1', '2024-06-01T10:00:00.000Z')],
        checkins: [],
        cursor: '1',
        hasMore: true,
      },
      {
        habits: [],
        checkins: [checkin('h1', '2024-06-01', '2024-06-01T10:01:00.000Z')],
        cursor: '2',
        hasMore: false,
      },
    ]);

    const result = await createSyncEngine(api, storage).sync();

    expect(result.pulled).toBe(2);
    expect(api.pullCursors).toEqual([null, '1']);
    expect(storage.cursor).toBe('2');
    expect(storage.habits.has('h1')).toBe(true);
    expect(storage.checkins.has('h1:2024-06-01')).toBe(true);
  });

  it('resumes from the saved cursor', async () => {
    const storage = new MemoryStorage();
    storage.cursor = '41';
    const api = fakeApi();

    await createSyncEngine(api, storage).sync();

    expect(api.pullCursors).toEqual(['41']);
  });

  it('keeps local rows that are newer than the remote copy', async () => {
    const storage = new MemoryStorage();
    storage.habits.set('h1', habit('h1', '2024-06-01T12:00:00.000Z', { name: 'local' }));
    storage.habits.set('h2', habit('h2', '2024-06-01T08:00:00.000Z', { name: 'local' }));
    const api = fakeApi([
      {
        habits: [
          habit('h1', '2024-06-01T11:00:00.000Z', { name: 'remote' }),
          habit('h2', '2024-06-01T09:00:00.000Z', { name: 'remote' }),
        ],
        checkins: [],
        cursor: '5',
        hasMore: false,
      },
    ]);

    const result = await createSyncEngine(api, storage).sync();

    expect(result.pulled).toBe(1);
    expect(storage.habits.get('h1')!.name).toBe('local');
    expect(storage.habits.get('h2')!.name).toBe('remote');
    expect(storage.cursor).toBe('5');
  });

  it('applies remote deletes', async () => {
    const storage = new MemoryStorage();
    storage.checkins.set('h1:2024-06-01', checkin('h1', '2024-06-01', '2024-06-01T10:00:00.000Z'));
    const tombstone = {
      ...checkin('h1', '2024-06-01', '2024-06-01T10:30:00.000Z'),
      deletedAt: '2024-06-01T10:30:00.000Z',
    };
    const api = fakeApi([{ habits: [], checkins: [tombstone], cursor: '9', hasMore: false }]);

    await createSyncEngine(api, storage).sync();

    expect(storage.checkins.get('h1:2024-06-01')!.deletedAt).not.toBeNull();
  });

  it('stops if the server keeps returning the same cursor', async () => {
    const storage = new MemoryStorage();
    storage.cursor = '3';
    const stuck = { habits: [], checkins: [], cursor: '3', hasMore: true };
    const api = fakeApi([stuck, stuck, stuck]);

    await createSyncEngine(api, storage).sync();

    expect(api.pull).toHaveBeenCalledTimes(1);
  });
});

describe('sync', () => {
  it('pushes before pulling', async () => {
    const storage = new MemoryStorage();
    storage.enqueue('habit', habit('h1', '2024-06-01T10:00:00.000Z'));
    const calls: string[] = [];
    const api = fakeApi();
    (api.push as jest.Mock).mockImplementation(async () => calls.push('push'));
    (api.pull as jest.Mock).mockImplementation(async () => {
      calls.push('pull');
      return { habits: [], checkins: [], cursor: '1', hasMore: false };
    });

    await createSyncEngine(api, storage).sync();

    expect(calls).toEqual(['push', 'pull']);
  });

  it('shares one run between concurrent callers', async () => {
    const storage = new MemoryStorage();
    storage.enqueue('habit', habit('h1', '2024-06-01T10:00:00.000Z'));
    const api = fakeApi();
    const engine = createSyncEngine(api, storage);

    const [a, b] = await Promise.all([engine.sync(), engine.sync()]);

    expect(a).toBe(b);
    expect(api.push).toHaveBeenCalledTimes(1);
    expect(api.pull).toHaveBeenCalledTimes(1);
  });
});

describe('backoffDelay', () => {
  it('doubles up to the cap', () => {
    expect(backoffDelay(0)).toBe(0);
    expect(backoffDelay(1)).toBe(5_000);
    expect(backoffDelay(2)).toBe(10_000);
    expect(backoffDelay(4)).toBe(40_000);
    expect(backoffDelay(20)).toBe(300_000);
  });
});
