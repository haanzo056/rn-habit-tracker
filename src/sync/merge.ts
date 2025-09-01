import type { SyncMeta } from '@/types/habit';

function timestamp(value: string): number {
  const ms = Date.parse(value);
  return Number.isNaN(ms) ? 0 : ms;
}

// Last write wins on updatedAt. Ties go to the server copy so that every device
// converges on the same row no matter which one wrote first.
export function shouldApplyRemote(local: SyncMeta | null, remote: SyncMeta): boolean {
  if (!local) return true;
  return timestamp(remote.updatedAt) >= timestamp(local.updatedAt);
}
