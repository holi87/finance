import type { Account, Category, Reminder } from '@finance/shared-types';
import {
  Button,
  Card,
  CurrencyAmount,
  EmptyState,
  Input,
  SectionHeader,
  Select,
  SyncBadge,
  Textarea,
} from '@finance/ui';
import { useLiveQuery } from 'dexie-react-hooks';
import { useMemo, useState } from 'react';

import { useAuth } from '../auth/auth-context';
import { useWorkspace } from '../workspaces/workspace-context';
import { getDeviceId } from '../../services/session-store';
import {
  applyLocalTransactionToAccount,
  createLocalReminder,
  createLocalTransaction,
  db,
  deleteLocalReminder,
  enqueueCreateOperation,
  enqueueOperation,
  refreshPendingCount,
  updateLocalReminder,
} from '../../storage/db';
import {
  getReminderOccurrenceState,
  sortRemindersByUrgency,
} from '../../services/reminder-utils';

const EMPTY_ACCOUNTS: Account[] = [];
const EMPTY_CATEGORIES: Category[] = [];
const EMPTY_REMINDERS: Reminder[] = [];

function formatReminderTiming(reminder: Reminder, today: string) {
  const state = getReminderOccurrenceState(reminder, today);

  if (state.isDue) {
    return state.isOverdue
      ? `Zaległe od ${state.occurrenceDate}`
      : `Do rozliczenia ${state.occurrenceDate}`;
  }

  if (reminder.scheduleType === 'once' && reminder.lastCompletedAt) {
    return `Rozliczone ${reminder.lastCompletedAt}`;
  }

  if (!reminder.isActive) {
    return 'Pauza';
  }

  return state.nextDate ? `Następny termin ${state.nextDate}` : 'Bez terminu';
}

function buildReminderCreatePayload(input: {
  title: string;
  notes: string;
  amount: string;
  currency: string;
  accountId: string;
  categoryId: string;
  scheduleType: Reminder['scheduleType'];
  dueDate: string;
  dueDayOfMonth: string;
}) {
  return {
    title: input.title,
    notes: input.notes || undefined,
    amount: input.amount,
    currency: input.currency,
    accountId: input.accountId,
    categoryId: input.categoryId || null,
    scheduleType: input.scheduleType,
    dueDate: input.scheduleType === 'once' ? input.dueDate : null,
    dueDayOfMonth:
      input.scheduleType === 'monthly' ? Number(input.dueDayOfMonth) : null,
  };
}

function buildReminderUpdatePayload(reminder: Reminder) {
  return {
    title: reminder.title,
    notes: reminder.notes,
    amount: reminder.amount,
    currency: reminder.currency,
    accountId: reminder.accountId,
    categoryId: reminder.categoryId,
    scheduleType: reminder.scheduleType,
    dueDate: reminder.dueDate,
    dueDayOfMonth: reminder.dueDayOfMonth,
    isActive: reminder.isActive,
    lastCompletedAt: reminder.lastCompletedAt,
  };
}

export function RemindersPage() {
  const { user } = useAuth();
  const { activeWorkspaceId, activeWorkspace } = useWorkspace();
  const accounts =
    useLiveQuery(
      () =>
        activeWorkspaceId
          ? db.accounts.where('workspaceId').equals(activeWorkspaceId).toArray()
          : Promise.resolve([] as Account[]),
      [activeWorkspaceId],
    ) ?? EMPTY_ACCOUNTS;
  const categories =
    useLiveQuery(
      () =>
        activeWorkspaceId
          ? db.categories
              .where('workspaceId')
              .equals(activeWorkspaceId)
              .toArray()
          : Promise.resolve([] as Category[]),
      [activeWorkspaceId],
    ) ?? EMPTY_CATEGORIES;
  const reminders =
    useLiveQuery(
      () =>
        activeWorkspaceId
          ? db.reminders
              .where('workspaceId')
              .equals(activeWorkspaceId)
              .toArray()
          : Promise.resolve([] as Reminder[]),
      [activeWorkspaceId],
    ) ?? EMPTY_REMINDERS;

  const today = new Date().toISOString().slice(0, 10);
  const visibleAccounts = useMemo(
    () => accounts.filter((account) => !account.deletedAt && !account.isArchived),
    [accounts],
  );
  const visibleCategories = useMemo(
    () => categories.filter((category) => !category.deletedAt),
    [categories],
  );
  const visibleReminders = useMemo(
    () => reminders.filter((reminder) => !reminder.deletedAt),
    [reminders],
  );
  const activeReminders = useMemo(
    () => visibleReminders.filter((reminder) => reminder.isActive),
    [visibleReminders],
  );
  const sortedActiveReminders = useMemo(
    () => sortRemindersByUrgency(activeReminders, today),
    [activeReminders, today],
  );
  const dueReminders = useMemo(
    () =>
      sortedActiveReminders.filter((reminder) =>
        getReminderOccurrenceState(reminder, today).isDue,
      ),
    [sortedActiveReminders, today],
  );
  const upcomingReminders = useMemo(
    () =>
      sortedActiveReminders.filter(
        (reminder) => !getReminderOccurrenceState(reminder, today).isDue,
      ),
    [sortedActiveReminders, today],
  );
  const inactiveReminders = useMemo(
    () =>
      visibleReminders
        .filter((reminder) => !reminder.isActive)
        .slice()
        .sort((left, right) => right.updatedAt.localeCompare(left.updatedAt)),
    [visibleReminders],
  );

  const [editingReminderId, setEditingReminderId] = useState<string | null>(null);
  const [title, setTitle] = useState('');
  const [notes, setNotes] = useState('');
  const [amount, setAmount] = useState('');
  const [accountId, setAccountId] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [scheduleType, setScheduleType] =
    useState<Reminder['scheduleType']>('monthly');
  const [dueDate, setDueDate] = useState(today);
  const [dueDayOfMonth, setDueDayOfMonth] = useState(
    String(new Date().getDate()),
  );
  const [isActive, setIsActive] = useState('true');
  const [submitting, setSubmitting] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const editingReminder = editingReminderId
    ? visibleReminders.find((reminder) => reminder.id === editingReminderId) ?? null
    : null;
  const resolvedAccountId =
    accountId && visibleAccounts.some((account) => account.id === accountId)
      ? accountId
      : (visibleAccounts[0]?.id ?? '');
  const resolvedCategoryId =
    categoryId === '' ||
    visibleCategories.some((category) => category.id === categoryId)
      ? categoryId
      : '';
  const selectedAccount =
    visibleAccounts.find((account) => account.id === resolvedAccountId) ?? null;
  const reminderCurrency =
    selectedAccount?.currency ?? activeWorkspace?.baseCurrency ?? 'PLN';

  if (!activeWorkspaceId || !activeWorkspace) {
    return (
      <EmptyState
        title="Brak aktywnego workspace’u"
        description="Wybierz dashboard, żeby zarządzać przypomnieniami dla domu, JDG albo firmy."
      />
    );
  }

  const resetForm = () => {
    setEditingReminderId(null);
    setTitle('');
    setNotes('');
    setAmount('');
    setAccountId(visibleAccounts[0]?.id ?? '');
    setCategoryId('');
    setScheduleType('monthly');
    setDueDate(today);
    setDueDayOfMonth(String(new Date().getDate()));
    setIsActive('true');
  };

  const populateForm = (reminder: Reminder) => {
    setEditingReminderId(reminder.id);
    setTitle(reminder.title);
    setNotes(reminder.notes ?? '');
    setAmount(reminder.amount);
    setAccountId(reminder.accountId ?? '');
    setCategoryId(reminder.categoryId ?? '');
    setScheduleType(reminder.scheduleType);
    setDueDate(reminder.dueDate ?? today);
    setDueDayOfMonth(String(reminder.dueDayOfMonth ?? new Date().getDate()));
    setIsActive(reminder.isActive ? 'true' : 'false');
    setFeedback(null);
    setError(null);
  };

  const handleSubmit = async () => {
    if (!activeWorkspaceId || !resolvedAccountId) {
      setError('Najpierw dodaj aktywne konto dla przypomnienia.');
      return;
    }
    if (scheduleType === 'once' && !dueDate) {
      setError('Jednorazowe przypomnienie wymaga konkretnej daty.');
      return;
    }
    if (
      scheduleType === 'monthly' &&
      (!dueDayOfMonth ||
        Number(dueDayOfMonth) < 1 ||
        Number(dueDayOfMonth) > 31)
    ) {
      setError('Miesięczne przypomnienie wymaga dnia od 1 do 31.');
      return;
    }

    setSubmitting(true);
    setError(null);
    setFeedback(null);

    try {
      const payload = buildReminderCreatePayload({
        title: title.trim(),
        notes: notes.trim(),
        amount: amount.trim(),
        currency: reminderCurrency,
        accountId: resolvedAccountId,
        categoryId: resolvedCategoryId,
        scheduleType,
        dueDate,
        dueDayOfMonth,
      });

      if (editingReminder) {
        const scheduleChanged =
          editingReminder.scheduleType !== payload.scheduleType ||
          editingReminder.dueDate !== payload.dueDate ||
          editingReminder.dueDayOfMonth !== payload.dueDayOfMonth;
        const nextReminder = updateLocalReminder(editingReminder, {
          title: payload.title,
          notes: payload.notes ?? null,
          amount: payload.amount,
          currency: payload.currency,
          accountId: payload.accountId,
          categoryId: payload.categoryId,
          scheduleType: payload.scheduleType,
          dueDate: payload.dueDate,
          dueDayOfMonth: payload.dueDayOfMonth,
          isActive: isActive === 'true',
          lastCompletedAt: scheduleChanged
            ? null
            : editingReminder.lastCompletedAt,
        });

        await db.reminders.put(nextReminder);
        await enqueueOperation({
          deviceId: getDeviceId(),
          workspaceId: activeWorkspaceId,
          entityType: 'reminder',
          entityId: nextReminder.id,
          operationType: 'update',
          baseVersion: editingReminder.version,
          payload: buildReminderUpdatePayload(nextReminder),
        });
        await refreshPendingCount(activeWorkspaceId);
        setFeedback('Przypomnienie zostało zaktualizowane.');
      } else {
        const reminder = {
          ...createLocalReminder(activeWorkspaceId, payload),
          isActive: isActive === 'true',
        };
        await db.reminders.put(reminder);
        await enqueueCreateOperation({
          deviceId: getDeviceId(),
          workspaceId: activeWorkspaceId,
          entityType: 'reminder',
          entityId: reminder.id,
          payload: buildReminderCreatePayload({
            title: reminder.title,
            notes: reminder.notes ?? '',
            amount: reminder.amount,
            currency: reminder.currency,
            accountId: reminder.accountId ?? '',
            categoryId: reminder.categoryId ?? '',
            scheduleType: reminder.scheduleType,
            dueDate: reminder.dueDate ?? '',
            dueDayOfMonth: String(reminder.dueDayOfMonth ?? ''),
          }),
        });
        await refreshPendingCount(activeWorkspaceId);
        setFeedback('Przypomnienie zostało dodane do planu.');
      }

      resetForm();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Nie udało się zapisać przypomnienia.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleToggle = async (reminder: Reminder) => {
    if (!activeWorkspaceId) {
      return;
    }

    const nextReminder = updateLocalReminder(reminder, {
      title: reminder.title,
      notes: reminder.notes,
      amount: reminder.amount,
      currency: reminder.currency,
      accountId: reminder.accountId,
      categoryId: reminder.categoryId,
      scheduleType: reminder.scheduleType,
      dueDate: reminder.dueDate,
      dueDayOfMonth: reminder.dueDayOfMonth,
      isActive: !reminder.isActive,
      lastCompletedAt: reminder.lastCompletedAt,
    });

    await db.reminders.put(nextReminder);
    await enqueueOperation({
      deviceId: getDeviceId(),
      workspaceId: activeWorkspaceId,
      entityType: 'reminder',
      entityId: nextReminder.id,
      operationType: 'update',
      baseVersion: reminder.version,
      payload: buildReminderUpdatePayload(nextReminder),
    });
    await refreshPendingCount(activeWorkspaceId);
  };

  const handleDelete = async (reminder: Reminder) => {
    if (!activeWorkspaceId || !window.confirm(`Usunąć przypomnienie „${reminder.title}”?`)) {
      return;
    }

    const deletedReminder = deleteLocalReminder(reminder);
    await db.reminders.put(deletedReminder);
    await enqueueOperation({
      deviceId: getDeviceId(),
      workspaceId: activeWorkspaceId,
      entityType: 'reminder',
      entityId: reminder.id,
      operationType: 'delete',
      baseVersion: reminder.version,
      payload: {},
    });
    await refreshPendingCount(activeWorkspaceId);

    if (editingReminderId === reminder.id) {
      resetForm();
    }
  };

  const handleSettle = async (reminder: Reminder) => {
    if (!activeWorkspaceId || !user || !reminder.accountId) {
      return;
    }

    const occurrence = getReminderOccurrenceState(reminder, today);
    if (!occurrence.occurrenceDate) {
      return;
    }

    const targetAccount = visibleAccounts.find(
      (account) => account.id === reminder.accountId,
    );

    if (!targetAccount) {
      setError('Nie można rozliczyć przypomnienia bez aktywnego konta.');
      return;
    }

    const transaction = createLocalTransaction(activeWorkspaceId, user.id, {
      accountId: reminder.accountId,
      categoryId:
        reminder.categoryId &&
        visibleCategories.some((category) => category.id === reminder.categoryId)
          ? reminder.categoryId
          : null,
      type: 'expense',
      amount: reminder.amount,
      currency: reminder.currency,
      description: reminder.title,
      notes: reminder.notes ?? undefined,
      transactionDate: today,
    });
    const nextReminder = updateLocalReminder(reminder, {
      title: reminder.title,
      notes: reminder.notes,
      amount: reminder.amount,
      currency: reminder.currency,
      accountId: reminder.accountId,
      categoryId: reminder.categoryId,
      scheduleType: reminder.scheduleType,
      dueDate: reminder.dueDate,
      dueDayOfMonth: reminder.dueDayOfMonth,
      isActive: reminder.scheduleType === 'monthly',
      lastCompletedAt: occurrence.occurrenceDate,
    });

    await db.transaction(
      'rw',
      [db.transactions, db.accounts, db.reminders],
      async () => {
        await db.transactions.put(transaction);
        await db.accounts.put(
          applyLocalTransactionToAccount(targetAccount, transaction),
        );
        await db.reminders.put(nextReminder);
      },
    );

    await enqueueCreateOperation({
      deviceId: getDeviceId(),
      workspaceId: activeWorkspaceId,
      entityType: 'transaction',
      entityId: transaction.id,
      payload: {
        accountId: transaction.accountId,
        categoryId: transaction.categoryId,
        type: transaction.type,
        amount: transaction.amount,
        currency: transaction.currency,
        description: transaction.description ?? undefined,
        notes: transaction.notes ?? undefined,
        transactionDate: transaction.transactionDate,
      },
    });
    await enqueueOperation({
      deviceId: getDeviceId(),
      workspaceId: activeWorkspaceId,
      entityType: 'reminder',
      entityId: nextReminder.id,
      operationType: 'update',
      baseVersion: reminder.version,
      payload: buildReminderUpdatePayload(nextReminder),
    });
    await refreshPendingCount(activeWorkspaceId);
    setFeedback(`Dodano transakcję i rozliczono „${reminder.title}”.`);
  };

  return (
    <div className="space-y-6">
      <SectionHeader
        eyebrow="Planner"
        title="Przypomnienia"
        description="Jednorazowe i miesięczne płatności pilnują terminów w aplikacji. Znikają z górnego raila dopiero po rozliczeniu."
      />

      {error ? (
        <Card className="border-rose-400/25 bg-rose-500/10 text-sm text-rose-100">
          {error}
        </Card>
      ) : null}
      {feedback ? (
        <Card className="border-lime-300/20 bg-lime-400/10 text-sm text-lime-100">
          {feedback}
        </Card>
      ) : null}

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1.2fr)_minmax(20rem,0.8fr)]">
        <Card className="space-y-4">
          <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="text-xs uppercase tracking-[0.25em] text-stone-500">
                Formularz
              </p>
              <h3 className="mt-2 text-xl font-semibold text-white">
                {editingReminder ? 'Edytuj przypomnienie' : 'Dodaj przypomnienie'}
              </h3>
            </div>
            {editingReminder ? (
              <Button variant="ghost" onClick={resetForm}>
                Anuluj edycję
              </Button>
            ) : null}
          </div>

          {visibleAccounts.length === 0 ? (
            <EmptyState
              title="Najpierw potrzebne jest konto"
              description="Przypomnienie powinno wiedzieć, z którego konta rozliczyć płatność."
            />
          ) : (
            <form
              className="grid gap-4 md:grid-cols-2"
              onSubmit={(event) => {
                event.preventDefault();
                void handleSubmit();
              }}
            >
              <Input
                label="Tytuł"
                name="title"
                value={title}
                onChange={setTitle}
                placeholder="Czynsz, ZUS, leasing, prąd…"
              />
              <Input
                label="Kwota"
                name="amount"
                value={amount}
                onChange={setAmount}
                placeholder="0.00"
              />
              <Select
                label="Konto"
                name="accountId"
                value={resolvedAccountId}
                onChange={setAccountId}
                options={visibleAccounts.map((account) => ({
                  label: `${account.name} · ${account.currency}`,
                  value: account.id,
                }))}
              />
              <Select
                label="Kategoria"
                name="categoryId"
                value={resolvedCategoryId}
                onChange={setCategoryId}
                options={[
                  { label: 'Bez kategorii', value: '' },
                  ...visibleCategories.map((category) => ({
                    label: category.name,
                    value: category.id,
                  })),
                ]}
              />
              <Select
                label="Typ harmonogramu"
                name="scheduleType"
                value={scheduleType}
                onChange={(value) =>
                  setScheduleType(value as Reminder['scheduleType'])
                }
                options={[
                  { label: 'Co miesiąc', value: 'monthly' },
                  { label: 'Jednorazowo', value: 'once' },
                ]}
              />
              {scheduleType === 'monthly' ? (
                <Input
                  label="Dzień miesiąca"
                  name="dueDayOfMonth"
                  type="number"
                  value={dueDayOfMonth}
                  onChange={setDueDayOfMonth}
                  placeholder="15"
                />
              ) : (
                <Input
                  label="Termin"
                  name="dueDate"
                  type="date"
                  value={dueDate}
                  onChange={setDueDate}
                />
              )}
              <Select
                label="Aktywne"
                name="isActive"
                value={isActive}
                onChange={setIsActive}
                options={[
                  { label: 'Tak', value: 'true' },
                  { label: 'Nie', value: 'false' },
                ]}
              />
              <div className="rounded-[24px] border border-white/10 bg-white/5 px-4 py-3 text-sm text-stone-300">
                <p className="text-xs uppercase tracking-[0.2em] text-stone-500">
                  Waluta
                </p>
                <p className="mt-2 font-semibold text-white">{reminderCurrency}</p>
                <p className="mt-1 text-xs text-stone-500">
                  Pobierana automatycznie z wybranego konta.
                </p>
              </div>
              <div className="md:col-span-2">
                <Textarea
                  label="Notatka"
                  name="notes"
                  value={notes}
                  onChange={setNotes}
                  placeholder="Numer faktury, dane dostawcy, dodatkowy kontekst…"
                />
              </div>
              <div className="md:col-span-2">
                <Button
                  type="submit"
                  disabled={
                    submitting ||
                    !resolvedAccountId ||
                    title.trim().length < 2 ||
                    !amount.trim() ||
                    (scheduleType === 'once' && !dueDate) ||
                    (scheduleType === 'monthly' &&
                      (!dueDayOfMonth ||
                        Number(dueDayOfMonth) < 1 ||
                        Number(dueDayOfMonth) > 31))
                  }
                >
                  {submitting
                    ? 'Zapisywanie…'
                    : editingReminder
                      ? 'Zapisz przypomnienie'
                      : 'Dodaj przypomnienie'}
                </Button>
              </div>
            </form>
          )}
        </Card>

        <Card className="space-y-4">
          <div>
            <p className="text-xs uppercase tracking-[0.25em] text-stone-500">
              Szybki stan
            </p>
            <h3 className="mt-2 text-xl font-semibold text-white">
              Obciążenia w kolejce
            </h3>
          </div>
          <div className="grid gap-3 sm:grid-cols-3 xl:grid-cols-1">
            <div className="rounded-[24px] border border-rose-400/20 bg-rose-500/10 p-4">
              <p className="text-xs uppercase tracking-[0.2em] text-rose-200/70">
                Do rozliczenia
              </p>
              <p className="mt-2 text-3xl font-semibold text-white">
                {dueReminders.length}
              </p>
            </div>
            <div className="rounded-[24px] border border-white/10 bg-white/5 p-4">
              <p className="text-xs uppercase tracking-[0.2em] text-stone-500">
                Zaplanowane
              </p>
              <p className="mt-2 text-3xl font-semibold text-white">
                {upcomingReminders.length}
              </p>
            </div>
            <div className="rounded-[24px] border border-white/10 bg-white/5 p-4">
              <p className="text-xs uppercase tracking-[0.2em] text-stone-500">
                Wstrzymane
              </p>
              <p className="mt-2 text-3xl font-semibold text-white">
                {inactiveReminders.length}
              </p>
            </div>
          </div>
          <div className="rounded-[24px] border border-white/10 bg-white/5 p-4 text-sm text-stone-300">
            Górna belka pokazuje tylko pozycje zaległe lub na dziś. Rozliczenie
            przypomnienia tworzy od razu transakcję i aktualizuje stan konta.
          </div>
        </Card>
      </div>

      {visibleReminders.length === 0 ? (
        <EmptyState
          title="Brak przypomnień"
          description="Dodaj pierwszy termin, aby aplikacja pilnowała rat, opłat albo jednorazowych kosztów."
        />
      ) : null}

      {dueReminders.length > 0 ? (
        <section className="space-y-3">
          <SectionHeader
            eyebrow="Teraz"
            title="Do rozliczenia"
            description="Te pozycje pozostają w górnym railu, dopóki nie utworzysz z nich transakcji."
          />
          <div className="grid gap-3">
            {dueReminders.map((reminder) => {
              const targetAccount = visibleAccounts.find(
                (account) => account.id === reminder.accountId,
              );
              const targetCategory = visibleCategories.find(
                (category) => category.id === reminder.categoryId,
              );

              return (
                <Card
                  key={reminder.id}
                  className="space-y-4 border-rose-400/20 bg-rose-500/10"
                >
                  <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                    <div className="space-y-2">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="text-xl font-semibold text-white">
                          {reminder.title}
                        </h3>
                        <SyncBadge
                          label={formatReminderTiming(reminder, today)}
                          tone={
                            getReminderOccurrenceState(reminder, today).isOverdue
                              ? 'danger'
                              : 'warning'
                          }
                        />
                      </div>
                      <p className="text-sm text-stone-300">
                        {targetAccount?.name ?? 'Brak aktywnego konta'}
                        {targetCategory ? ` · ${targetCategory.name}` : ''}
                      </p>
                      {reminder.notes ? (
                        <p className="text-sm text-stone-400">{reminder.notes}</p>
                      ) : null}
                    </div>
                    <CurrencyAmount
                      value={reminder.amount}
                      currency={reminder.currency}
                      className="text-2xl font-semibold text-white"
                    />
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Button
                      onClick={() => void handleSettle(reminder)}
                      disabled={!targetAccount}
                    >
                      Rozlicz i dodaj transakcję
                    </Button>
                    <Button variant="secondary" onClick={() => populateForm(reminder)}>
                      Edytuj
                    </Button>
                    <Button variant="ghost" onClick={() => void handleToggle(reminder)}>
                      Wstrzymaj
                    </Button>
                    <Button variant="ghost" onClick={() => void handleDelete(reminder)}>
                      Usuń
                    </Button>
                  </div>
                </Card>
              );
            })}
          </div>
        </section>
      ) : null}

      {upcomingReminders.length > 0 ? (
        <section className="space-y-3">
          <SectionHeader
            eyebrow="Dalej"
            title="Zaplanowane"
            description="Kolejne cykle i jednorazowe terminy, które jeszcze nie są wymagalne."
          />
          <div className="grid gap-3 xl:grid-cols-2">
            {upcomingReminders.map((reminder) => {
              const targetAccount = visibleAccounts.find(
                (account) => account.id === reminder.accountId,
              );
              const targetCategory = visibleCategories.find(
                (category) => category.id === reminder.categoryId,
              );

              return (
                <Card key={reminder.id} className="space-y-4">
                  <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                    <div className="space-y-2">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="text-lg font-semibold text-white">
                          {reminder.title}
                        </h3>
                        <SyncBadge
                          label={formatReminderTiming(reminder, today)}
                          tone="neutral"
                        />
                      </div>
                      <p className="text-sm text-stone-300">
                        {targetAccount?.name ?? 'Brak aktywnego konta'}
                        {targetCategory ? ` · ${targetCategory.name}` : ''}
                      </p>
                    </div>
                    <CurrencyAmount
                      value={reminder.amount}
                      currency={reminder.currency}
                      className="text-lg font-semibold text-lime-100"
                    />
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Button variant="secondary" onClick={() => populateForm(reminder)}>
                      Edytuj
                    </Button>
                    <Button variant="ghost" onClick={() => void handleToggle(reminder)}>
                      Wstrzymaj
                    </Button>
                    <Button variant="ghost" onClick={() => void handleDelete(reminder)}>
                      Usuń
                    </Button>
                  </div>
                </Card>
              );
            })}
          </div>
        </section>
      ) : null}

      {inactiveReminders.length > 0 ? (
        <section className="space-y-3">
          <SectionHeader
            eyebrow="Pauza"
            title="Nieaktywne"
            description="Wstrzymane i rozliczone jednorazowe pozycje zostają w historii, ale nie wracają na górny rail."
          />
          <div className="grid gap-3 xl:grid-cols-2">
            {inactiveReminders.map((reminder) => (
              <Card key={reminder.id} className="space-y-4 bg-white/5">
                <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                  <div className="space-y-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="text-lg font-semibold text-white">
                        {reminder.title}
                      </h3>
                      <SyncBadge label={formatReminderTiming(reminder, today)} tone="neutral" />
                    </div>
                    <p className="text-sm text-stone-400">
                      {reminder.notes ?? 'Bez dodatkowej notatki'}
                    </p>
                  </div>
                  <CurrencyAmount
                    value={reminder.amount}
                    currency={reminder.currency}
                    className="text-lg font-semibold text-stone-200"
                  />
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button variant="secondary" onClick={() => populateForm(reminder)}>
                    Edytuj
                  </Button>
                  <Button variant="ghost" onClick={() => void handleToggle(reminder)}>
                    Aktywuj
                  </Button>
                  <Button variant="ghost" onClick={() => void handleDelete(reminder)}>
                    Usuń
                  </Button>
                </div>
              </Card>
            ))}
          </div>
        </section>
      ) : null}
    </div>
  );
}
