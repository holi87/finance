import type { Reminder, SyncState, WorkspaceSummary } from '@finance/shared-types';
import {
  Button,
  Card,
  CurrencyAmount,
  SyncBadge,
  WorkspaceSwitcher,
} from '@finance/ui';
import { useLiveQuery } from 'dexie-react-hooks';
import { useMemo, useState } from 'react';
import { NavLink, Outlet, useLocation } from 'react-router-dom';

import { getReminderOccurrenceState, sortRemindersByUrgency } from '../services/reminder-utils';
import { useAuth } from '../features/auth/auth-context';
import { useSync } from '../features/sync/sync-context';
import { useWorkspace } from '../features/workspaces/workspace-context';
import { db } from '../storage/db';

const navigation = [
  { to: '/', label: 'Dashboard' },
  { to: '/transactions', label: 'Transakcje' },
  { to: '/budgets', label: 'Budżety' },
  { to: '/reminders', label: 'Przypomnienia' },
  { to: '/accounts', label: 'Konta' },
  { to: '/categories', label: 'Kategorie' },
  { to: '/admin', label: 'Admin' },
  { to: '/settings', label: 'Ustawienia' },
];

const mobilePrimaryNavigation = ['/', '/transactions', '/budgets'];
const workspaceTypeLabels: Record<WorkspaceSummary['type'], string> = {
  personal: 'Dom',
  business: 'JDG',
  company: 'Firma',
  shared: 'Wspólny',
};
const workspaceRoleLabels: Record<WorkspaceSummary['role'], string> = {
  owner: 'Właściciel',
  editor: 'Edytor',
  viewer: 'Podgląd',
};
const EMPTY_REMINDERS: Reminder[] = [];

export function AppLayout() {
  const { user } = useAuth();
  const { online, syncing, runSync } = useSync();
  const location = useLocation();
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
  const liveReminders = useLiveQuery(
    () =>
      activeWorkspaceId
        ? db.reminders
            .where('workspaceId')
            .equals(activeWorkspaceId)
            .toArray()
        : Promise.resolve([] as Reminder[]),
    [activeWorkspaceId],
  );
  const reminders = useMemo(
    () => liveReminders ?? EMPTY_REMINDERS,
    [liveReminders],
  );

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
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const primaryMobileItems = useMemo(
    () =>
      visibleNavigation.filter((item) =>
        mobilePrimaryNavigation.includes(item.to),
      ),
    [visibleNavigation],
  );
  const secondaryMobileItems = useMemo(
    () =>
      visibleNavigation.filter(
        (item) => !mobilePrimaryNavigation.includes(item.to),
      ),
    [visibleNavigation],
  );
  const moreIsActive = secondaryMobileItems.some(
    (item) => item.to === location.pathname,
  );
  const today = new Date().toISOString().slice(0, 10);
  const dueReminderEntries = useMemo(
    () =>
      sortRemindersByUrgency(
        reminders.filter((reminder) => !reminder.deletedAt && reminder.isActive),
        today,
      )
        .map((reminder) => ({
          reminder,
          state: getReminderOccurrenceState(reminder, today),
        }))
        .filter((entry) => entry.state.isDue),
    [reminders, today],
  );
  const dueReminderPreview = dueReminderEntries.slice(0, 2);
  const hiddenDueReminders = Math.max(0, dueReminderEntries.length - dueReminderPreview.length);

  return (
    <div className="min-h-screen overflow-x-clip bg-app-radial px-3 pb-36 pt-4 sm:px-6 sm:pt-6 lg:px-8">
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
                  onClick={() => setMobileMenuOpen(false)}
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

        <main className="min-w-0 flex-1 space-y-6">
          <Card className="overflow-hidden">
            <div className="flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
              <div className="min-w-0 space-y-3">
                <p className="text-xs uppercase tracking-[0.35em] text-lime-300">
                  Active context
                </p>
                <div className="space-y-2">
                  <h2 className="break-words text-3xl font-semibold tracking-tight text-white sm:text-4xl">
                    {activeWorkspace?.name ?? 'Wybierz workspace'}
                  </h2>
                  <p className="max-w-2xl break-words text-sm text-stone-400">
                    Dane są czytane z lokalnej bazy, a sync pokazuje rzeczywisty
                    stan połączenia i outboxa.
                  </p>
                </div>

                <div className="space-y-3 lg:hidden">
                  <WorkspaceSwitcher
                    label="Przełącz dashboard"
                    value={activeWorkspaceId ?? ''}
                    onChange={setActiveWorkspaceId}
                    options={workspaces.map((workspace) => ({
                      label: workspace.name,
                      value: workspace.id,
                      note: workspaceRoleLabels[workspace.role],
                    }))}
                  />

                  <div className="-mx-1 flex snap-x gap-2 overflow-x-auto px-1 pb-1">
                    {workspaces.map((workspace) => {
                      const isActive = workspace.id === activeWorkspaceId;

                      return (
                        <button
                          key={workspace.id}
                          type="button"
                          onClick={() => setActiveWorkspaceId(workspace.id)}
                          className={`w-[min(16rem,82vw)] shrink-0 snap-start rounded-2xl border px-4 py-3 text-left transition ${
                            isActive
                              ? 'border-lime-300 bg-lime-300 text-stone-950'
                              : 'border-white/10 bg-white/5 text-stone-200'
                          }`}
                        >
                          <div className="text-sm font-semibold">
                            {workspace.name}
                          </div>
                          <div
                            className={`mt-1 text-xs ${
                              isActive ? 'text-stone-800' : 'text-stone-400'
                            }`}
                          >
                            {workspaceTypeLabels[workspace.type]} ·{' '}
                            {workspace.baseCurrency}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>

              <div className="flex max-w-full flex-col items-start gap-3 md:items-end">
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

          {dueReminderEntries.length > 0 && location.pathname !== '/reminders' ? (
            <Card className="space-y-4 border-amber-300/20 bg-amber-400/10">
              <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                <div>
                  <p className="text-xs uppercase tracking-[0.25em] text-amber-200/80">
                    Na górze kolejki
                  </p>
                  <h3 className="mt-2 text-xl font-semibold text-white">
                    {dueReminderEntries.length} płatności czeka na rozliczenie
                  </h3>
                  <p className="mt-1 text-sm text-stone-300">
                    Rail pokazuje tylko terminy zaległe lub przypadające na dziś.
                  </p>
                </div>
                <NavLink
                  to="/reminders"
                  className="inline-flex items-center justify-center rounded-full bg-lime-300 px-4 py-2 text-sm font-semibold text-stone-950 transition hover:bg-lime-200"
                >
                  Otwórz przypomnienia
                </NavLink>
              </div>

              <div className="grid gap-3 xl:grid-cols-2">
                {dueReminderPreview.map(({ reminder, state }) => (
                  <div
                    key={reminder.id}
                    className="rounded-[24px] border border-white/10 bg-stone-950/50 px-4 py-3"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold text-white">
                          {reminder.title}
                        </p>
                        <p className="mt-1 text-xs text-stone-400">
                          {state.isOverdue
                            ? `Zaległe od ${state.occurrenceDate}`
                            : `Termin ${state.occurrenceDate}`}
                        </p>
                      </div>
                      <CurrencyAmount
                        value={reminder.amount}
                        currency={reminder.currency}
                        className="text-sm font-semibold text-amber-100"
                      />
                    </div>
                  </div>
                ))}
              </div>

              {hiddenDueReminders > 0 ? (
                <p className="text-sm text-stone-300">
                  +{hiddenDueReminders} kolejnych przypomnień znajdziesz w sekcji
                  „Przypomnienia”.
                </p>
              ) : null}
            </Card>
          ) : null}
          <Outlet />
        </main>
      </div>

      {mobileMenuOpen ? (
        <div
          className="fixed inset-0 z-30 bg-stone-950/65 lg:hidden"
          onClick={() => setMobileMenuOpen(false)}
        >
          <div
            className="absolute bottom-[calc(env(safe-area-inset-bottom)+6rem)] left-1/2 w-[calc(100%-2rem)] max-w-xl -translate-x-1/2 rounded-[28px] border border-white/10 bg-stone-950/95 p-4 shadow-[0_30px_80px_rgba(0,0,0,0.45)] backdrop-blur"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="mb-4 flex items-center justify-between">
              <div>
                <p className="text-xs uppercase tracking-[0.25em] text-lime-300">
                  Więcej
                </p>
                <p className="mt-1 text-sm text-stone-400">
                  Dodatkowe sekcje poza 4-slotową nawigacją PWA.
                </p>
              </div>
              <Button variant="ghost" onClick={() => setMobileMenuOpen(false)}>
                Zamknij
              </Button>
            </div>

            <div className="grid gap-2">
              {secondaryMobileItems.map((item) => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  onClick={() => setMobileMenuOpen(false)}
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
          </div>
        </div>
      ) : null}

      <div className="fixed inset-x-0 bottom-0 z-20 border-t border-white/10 bg-stone-950/95 px-2 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-2 backdrop-blur lg:hidden">
        <nav className="mx-auto grid w-full max-w-3xl grid-cols-4 gap-2">
          {primaryMobileItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              onClick={() => setMobileMenuOpen(false)}
              className={({ isActive }) =>
                `flex min-h-[3.5rem] items-center justify-center rounded-2xl px-3 py-3 text-center text-xs font-semibold transition ${
                  isActive
                    ? 'bg-lime-300 text-stone-950'
                    : 'bg-white/5 text-stone-300'
                }`
              }
            >
              {item.label}
            </NavLink>
          ))}
          <button
            type="button"
            onClick={() => setMobileMenuOpen((current) => !current)}
            className={`min-h-[3.5rem] rounded-2xl px-3 py-3 text-center text-xs font-semibold transition ${
              moreIsActive || mobileMenuOpen
                ? 'bg-lime-300 text-stone-950'
                : 'bg-white/5 text-stone-300'
            }`}
          >
            Więcej
          </button>
        </nav>
      </div>
    </div>
  );
}
