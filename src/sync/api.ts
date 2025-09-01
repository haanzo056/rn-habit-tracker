import type { Checkin, Habit } from '@/types/habit';

export interface ChangeSet {
  habits: Habit[];
  checkins: Checkin[];
}

export interface PullResponse extends ChangeSet {
  cursor: string;
  hasMore: boolean;
}

export interface SyncApi {
  push(changes: ChangeSet): Promise<void>;
  pull(cursor: string | null): Promise<PullResponse>;
}

export class HttpError extends Error {
  constructor(
    readonly status: number,
    message: string,
  ) {
    super(message);
    this.name = 'HttpError';
  }

  get retryable(): boolean {
    return this.status >= 500 || this.status === 408 || this.status === 429;
  }
}

export function createHttpApi(baseUrl: string, timeoutMs = 15_000): SyncApi {
  const root = baseUrl.replace(/\/+$/, '');

  async function request<T>(path: string, init?: RequestInit): Promise<T> {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const res = await fetch(`${root}${path}`, {
        ...init,
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        signal: controller.signal,
      });
      if (!res.ok) {
        throw new HttpError(res.status, `${init?.method ?? 'GET'} ${path} -> ${res.status}`);
      }
      return (await res.json()) as T;
    } finally {
      clearTimeout(timer);
    }
  }

  return {
    async push(changes) {
      await request('/sync/push', { method: 'POST', body: JSON.stringify(changes) });
    },
    pull(cursor) {
      const query = cursor ? `?since=${encodeURIComponent(cursor)}` : '';
      return request<PullResponse>(`/sync/pull${query}`);
    },
  };
}
