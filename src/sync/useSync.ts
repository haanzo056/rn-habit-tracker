import NetInfo from '@react-native-community/netinfo';
import { useEffect } from 'react';
import { AppState } from 'react-native';
import { getDb } from '@/db/client';
import { outboxCounts, resetFailed } from '@/db/outbox';
import { useHabits } from '@/store/habits';
import { useSyncStatus } from '@/store/sync';
import { createHttpApi } from './api';
import { MAX_ATTEMPTS, backoffDelay, createSyncEngine, type SyncEngine } from './engine';
import { createSqliteSyncStorage } from './sqliteStorage';

const API_URL = process.env.EXPO_PUBLIC_API_URL;
const IDLE_INTERVAL = 5 * 60_000;
const LOCAL_CHANGE_DEBOUNCE = 2_000;

let engine: SyncEngine | null = null;
let failures = 0;
let online = true;
let timer: ReturnType<typeof setTimeout> | null = null;

function getEngine(): SyncEngine | null {
  if (!API_URL) return null;
  engine ??= createSyncEngine(createHttpApi(API_URL), createSqliteSyncStorage(getDb));
  return engine;
}

function schedule(delay: number) {
  if (timer) clearTimeout(timer);
  timer = setTimeout(() => void syncNow(), delay);
}

async function refreshCounts() {
  const counts = await outboxCounts(await getDb(), MAX_ATTEMPTS);
  useSyncStatus.setState(counts);
}

export async function syncNow(): Promise<void> {
  const current = getEngine();
  if (!current) return;
  if (!online) {
    useSyncStatus.setState({ status: 'offline' });
    return;
  }

  useSyncStatus.setState({ status: 'syncing' });
  try {
    const { pulled } = await current.sync();
    failures = 0;
    if (pulled > 0) await useHabits.getState().load();
    useSyncStatus.setState({
      status: 'idle',
      lastSyncedAt: new Date().toISOString(),
      lastError: null,
    });
    schedule(IDLE_INTERVAL);
  } catch (err) {
    failures++;
    useSyncStatus.setState({
      status: 'error',
      lastError: err instanceof Error ? err.message : String(err),
    });
    schedule(backoffDelay(failures));
  } finally {
    await refreshCounts().catch(() => undefined);
  }
}

export async function retryFailedChanges(): Promise<void> {
  await resetFailed(await getDb());
  await syncNow();
}

export function useSync(): void {
  useEffect(() => {
    if (!getEngine()) {
      useSyncStatus.setState({ status: 'disabled' });
      return;
    }

    void syncNow();

    const unsubscribeNet = NetInfo.addEventListener((state) => {
      // isInternetReachable is null while unknown; only treat an explicit false as offline
      const next = !!state.isConnected && state.isInternetReachable !== false;
      const cameBack = next && !online;
      online = next;
      if (cameBack) {
        failures = 0;
        void syncNow();
      } else if (!next) {
        useSyncStatus.setState({ status: 'offline' });
      }
    });

    const appState = AppState.addEventListener('change', (state) => {
      if (state === 'active') void syncNow();
    });

    let debounce: ReturnType<typeof setTimeout> | null = null;
    const unsubscribeStore = useHabits.subscribe((state, prev) => {
      if (state.lastLocalChange === prev.lastLocalChange) return;
      void refreshCounts().catch(() => undefined);
      if (debounce) clearTimeout(debounce);
      debounce = setTimeout(() => void syncNow(), LOCAL_CHANGE_DEBOUNCE);
    });

    return () => {
      unsubscribeNet();
      appState.remove();
      unsubscribeStore();
      if (debounce) clearTimeout(debounce);
      if (timer) clearTimeout(timer);
    };
  }, []);
}
