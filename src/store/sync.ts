import { create } from 'zustand';

export type SyncStatus = 'disabled' | 'idle' | 'syncing' | 'offline' | 'error';

interface SyncStatusState {
  status: SyncStatus;
  lastSyncedAt: string | null;
  lastError: string | null;
  pending: number;
  failed: number;
}

export const useSyncStatus = create<SyncStatusState>()(() => ({
  status: 'disabled',
  lastSyncedAt: null,
  lastError: null,
  pending: 0,
  failed: 0,
}));
