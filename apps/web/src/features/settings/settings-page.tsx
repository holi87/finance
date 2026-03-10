import type { SyncState } from '@finance/shared-types';
import { Button, Card, SectionHeader, SyncBadge } from '@finance/ui';
import { useLiveQuery } from 'dexie-react-hooks';

import { useAuth } from '../auth/auth-context';
import { useSync } from '../sync/sync-context';
import { useWorkspace } from '../workspaces/workspace-context';
import { getDeviceId } from '../../services/session-store';
import { db } from '../../storage/db';

export function SettingsPage() {
  const { user, logout } = useAuth();
  const { online, syncing, runSync } = useSync();
  const { activeWorkspaceId } = useWorkspace();
  const syncState = useLiveQuery<SyncState | null>(
    () =>
      activeWorkspaceId
        ? db.syncStates.get(activeWorkspaceId).then((value) => value ?? null)
        : Promise.resolve(null),
    [activeWorkspaceId],
  ) ?? null;

  return (
    <div className="space-y-6">
      <SectionHeader eyebrow="Control" title="Ustawienia" description="Profil, stan urządzenia i ręczne akcje synchronizacji." />

      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="space-y-4">
          <div>
            <p className="text-xs uppercase tracking-[0.25em] text-stone-500">Profil</p>
            <h3 className="mt-2 text-xl font-semibold text-white">{user?.displayName}</h3>
            <p className="text-sm text-stone-400">{user?.email}</p>
          </div>
          <div className="rounded-[24px] border border-white/10 bg-white/5 p-4 text-sm text-stone-300">
            Device ID
            <div className="mt-2 break-all font-mono text-xs text-stone-400">{getDeviceId()}</div>
          </div>
        </Card>

        <Card className="space-y-4">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs uppercase tracking-[0.25em] text-stone-500">Sync</p>
              <h3 className="mt-2 text-xl font-semibold text-white">Stan synchronizacji</h3>
            </div>
            <SyncBadge
              label={!online ? 'Offline' : syncing ? 'Syncing' : syncState?.status ?? 'idle'}
              tone={!online ? 'warning' : syncState?.status === 'error' ? 'danger' : 'success'}
            />
          </div>
          <div className="space-y-2 text-sm text-stone-400">
            <p>Pending operations: {syncState?.pendingOperations ?? 0}</p>
            <p>Last sync: {syncState?.lastSyncedAt ?? 'never'}</p>
            {syncState?.errorMessage ? <p className="text-rose-300">{syncState.errorMessage}</p> : null}
          </div>
          <div className="flex gap-3">
            <Button variant="secondary" onClick={() => void runSync()}>
              Synchronizuj
            </Button>
            <Button variant="ghost" onClick={() => void logout()}>
              Wyloguj i wyczyść lokalne dane
            </Button>
          </div>
        </Card>
      </div>
    </div>
  );
}
