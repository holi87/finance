import type { SyncState } from '@finance/shared-types';
import { Button, Card, SyncBadge, WorkspaceSwitcher } from '@finance/ui';
import { useLiveQuery } from 'dexie-react-hooks';
import { NavLink, Outlet } from 'react-router-dom';

import { useAuth } from '../features/auth/auth-context';
import { useSync } from '../features/sync/sync-context';
import { useWorkspace } from '../features/workspaces/workspace-context';
import { db } from '../storage/db';

const navigation = [
  { to: '/', label: 'Dashboard' },
  { to: '/transactions', label: 'Transakcje' },
  { to: '/accounts', label: 'Konta' },
  { to: '/categories', label: 'Kategorie' },
  { to: '/budgets', label: 'Budżety' },
  { to: '/admin', label: 'Admin' },
  { to: '/settings', label: 'Ustawienia' },
];

export function AppLayout() {
  const { user } = useAuth();
  const { online, syncing, runSync } = useSync();
  const {
    workspaces,
    activeWorkspaceId,
    setActiveWorkspaceId,
    activeWorkspace,
  } = useWorkspace();
  const syncState =
    useLiveQuery<SyncState | null>(
      () =>
        activeWorkspaceId
          ? db.syncStates.get(activeWorkspaceId).then((value) => value ?? null)
          : Promise.resolve(null),
      [activeWorkspaceId],
    ) ?? null;

  const syncTone = !online
    ? 'warning'
    : syncing
      ? 'neutral'
      : syncState?.status === 'error'
        ? 'danger'
        : 'success';
  const syncLabel = !online
    ? 'Offline'
    : syncing
      ? 'Synchronizacja…'
      : syncState?.pendingOperations
        ? `${syncState.pendingOperations} zmian czeka`
        : 'Wszystko zsynchronizowane';
  const visibleNavigation = navigation.filter(
    (item) => item.to !== '/admin' || user?.isSystemAdmin,
  );

  return (
    <div className="min-h-screen bg-app-radial px-4 pb-28 pt-6 sm:px-6 lg:px-8">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-6 lg:flex-row">
        <aside className="hidden w-72 shrink-0 lg:block">
          <Card className="sticky top-6 space-y-6">
            <div className="space-y-3">
              <p className="text-xs uppercase tracking-[0.3em] text-lime-300">
                Budget Tracker
              </p>
              <div>
                <h1 className="font-display text-3xl font-bold text-white">
                  Offline-first control center
                </h1>
                <p className="mt-2 text-sm text-stone-400">
                  Budżety rodzinne, JDG i firmowe w jednym workspace-driven
                  systemie.
                </p>
              </div>
            </div>

            <WorkspaceSwitcher
              label="Aktywny workspace"
              value={activeWorkspaceId ?? ''}
              onChange={setActiveWorkspaceId}
              options={workspaces.map((workspace) => ({
                label: workspace.name,
                value: workspace.id,
                note: workspace.role,
              }))}
            />

            <div className="space-y-3">
              {visibleNavigation.map((item) => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  className={({ isActive }) =>
                    `block rounded-2xl px-4 py-3 text-sm font-medium transition ${
                      isActive
                        ? 'bg-lime-300 text-stone-950'
                        : 'bg-white/5 text-stone-300 hover:bg-white/10'
                    }`
                  }
                >
                  {item.label}
                </NavLink>
              ))}
            </div>

            <div className="rounded-[24px] border border-white/10 bg-white/5 p-4">
              <p className="text-xs uppercase tracking-[0.2em] text-stone-500">
                Aktualny operator
              </p>
              <p className="mt-2 text-lg font-semibold text-white">
                {user?.displayName}
              </p>
              <p className="text-sm text-stone-400">{user?.email}</p>
              {user?.isSystemAdmin ? (
                <div className="mt-3">
                  <SyncBadge label="System admin" tone="success" />
                </div>
              ) : null}
            </div>
          </Card>
        </aside>

        <main className="flex-1 space-y-6">
          <Card className="overflow-hidden">
            <div className="flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
              <div className="space-y-3">
                <p className="text-xs uppercase tracking-[0.35em] text-lime-300">
                  Active context
                </p>
                <div className="space-y-2">
                  <h2 className="font-display text-4xl font-bold tracking-tight text-white">
                    {activeWorkspace?.name ?? 'Wybierz workspace'}
                  </h2>
                  <p className="max-w-2xl text-sm text-stone-400">
                    Dane są czytane z lokalnej bazy, a sync pokazuje rzeczywisty
                    stan połączenia i outboxa.
                  </p>
                </div>
              </div>

              <div className="flex flex-col items-start gap-3 md:items-end">
                <SyncBadge label={syncLabel} tone={syncTone} />
                <Button
                  variant="secondary"
                  onClick={() => void runSync()}
                  disabled={!activeWorkspaceId}
                >
                  Synchronizuj teraz
                </Button>
              </div>
            </div>
          </Card>

          <Outlet />
        </main>
      </div>

      <nav className="fixed bottom-4 left-1/2 z-20 flex w-[calc(100%-2rem)] max-w-3xl -translate-x-1/2 gap-2 rounded-[26px] border border-white/10 bg-stone-950/90 p-3 backdrop-blur lg:hidden">
        {visibleNavigation.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            className={({ isActive }) =>
              `flex-1 rounded-2xl px-3 py-3 text-center text-xs font-semibold transition ${
                isActive
                  ? 'bg-lime-300 text-stone-950'
                  : 'bg-transparent text-stone-300'
              }`
            }
          >
            {item.label}
          </NavLink>
        ))}
      </nav>
    </div>
  );
}
