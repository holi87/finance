import type { SyncState } from '@finance/shared-types';
import { useLiveQuery } from 'dexie-react-hooks';
import {
  createContext,
  useContext,
  useEffect,
  useEffectEvent,
  useState,
  type PropsWithChildren,
} from 'react';

import { useAuth } from '../auth/auth-context';
import { useWorkspace } from '../workspaces/workspace-context';
import { db, setSyncState } from '../../storage/db';
import { ensureWorkspaceHydrated, syncWorkspace } from '../../sync/sync-service';

interface SyncContextValue {
  online: boolean;
  syncing: boolean;
  runSync: () => Promise<void>;
  hydrate: () => Promise<void>;
}

const SyncContext = createContext<SyncContextValue | null>(null);

export function SyncProvider({ children }: PropsWithChildren) {
  const { request, session } = useAuth();
  const { activeWorkspaceId } = useWorkspace();
  const [online, setOnline] = useState(() => navigator.onLine);
  const [syncing, setSyncing] = useState(false);
  const syncState = useLiveQuery<SyncState | null>(
    () =>
      activeWorkspaceId
        ? db.syncStates.get(activeWorkspaceId).then((value) => value ?? null)
        : Promise.resolve(null),
    [activeWorkspaceId],
  ) ?? null;

  const handleAutoSync = useEffectEvent(() => {
    if (!session || !activeWorkspaceId) {
      return;
    }

    void (async () => {
      try {
        setSyncing(true);
        await ensureWorkspaceHydrated(request, activeWorkspaceId);
        await syncWorkspace(request, activeWorkspaceId);
      } finally {
        setSyncing(false);
      }
    })();
  });

  useEffect(() => {
    const onOnline = () => {
      setOnline(true);
      handleAutoSync();
    };
    const onOffline = () => {
      setOnline(false);
      if (activeWorkspaceId) {
        void setSyncState(activeWorkspaceId, { status: 'offline' });
      }
    };

    window.addEventListener('online', onOnline);
    window.addEventListener('offline', onOffline);
    window.addEventListener('focus', handleAutoSync);

    return () => {
      window.removeEventListener('online', onOnline);
      window.removeEventListener('offline', onOffline);
      window.removeEventListener('focus', handleAutoSync);
    };
  }, [activeWorkspaceId]);

  useEffect(() => {
    if (session && activeWorkspaceId && !syncState) {
      void ensureWorkspaceHydrated(request, activeWorkspaceId);
    }
  }, [activeWorkspaceId, request, session, syncState]);

  return (
    <SyncContext.Provider
      value={{
        online,
        syncing,
        runSync: async () => {
          if (!session || !activeWorkspaceId) {
            return;
          }
          setSyncing(true);
          try {
            await syncWorkspace(request, activeWorkspaceId);
          } finally {
            setSyncing(false);
          }
        },
        hydrate: async () => {
          if (!session || !activeWorkspaceId) {
            return;
          }
          await ensureWorkspaceHydrated(request, activeWorkspaceId);
        },
      }}
    >
      {children}
    </SyncContext.Provider>
  );
}

export function useSync() {
  const context = useContext(SyncContext);
  if (!context) {
    throw new Error('useSync must be used within SyncProvider');
  }
  return context;
}
