import type { Account, Transaction } from '@finance/shared-types';
import {
  Button,
  CurrencyAmount,
  EmptyState,
  Input,
  SectionHeader,
  Select,
  SyncBadge,
} from '@finance/ui';
import { useLiveQuery } from 'dexie-react-hooks';
import { useMemo, useState } from 'react';

import { useWorkspace } from '../workspaces/workspace-context';
import {
  createLocalAccount,
  db,
  deleteLocalAccount,
  enqueueCreateOperation,
  enqueueOperation,
  refreshPendingCount,
  updateLocalAccount,
} from '../../storage/db';
import { getDeviceId } from '../../services/session-store';

type AccountDraftType = 'bank' | 'cash' | 'savings' | 'credit' | 'investment';

const accountTypeOptions = [
  { label: 'Bank', value: 'bank' },
  { label: 'Cash', value: 'cash' },
  { label: 'Savings', value: 'savings' },
  { label: 'Credit', value: 'credit' },
  { label: 'Investment', value: 'investment' },
] as const;
const EMPTY_ACCOUNTS: Account[] = [];
const EMPTY_TRANSACTIONS: Transaction[] = [];

export function AccountsPage() {
  const { activeWorkspaceId, activeWorkspace } = useWorkspace();
  const accounts =
    useLiveQuery(
      () =>
        activeWorkspaceId
          ? db.accounts.where('workspaceId').equals(activeWorkspaceId).toArray()
          : Promise.resolve([] as Account[]),
      [activeWorkspaceId],
    ) ?? EMPTY_ACCOUNTS;
  const transactions =
    useLiveQuery(
      () =>
        activeWorkspaceId
          ? db.transactions
              .where('workspaceId')
              .equals(activeWorkspaceId)
              .toArray()
          : Promise.resolve([] as Transaction[]),
      [activeWorkspaceId],
    ) ?? EMPTY_TRANSACTIONS;
  const visibleAccounts = useMemo(
    () => accounts.filter((account) => !account.deletedAt),
    [accounts],
  );
  const visibleTransactions = useMemo(
    () => transactions.filter((transaction) => !transaction.deletedAt),
    [transactions],
  );
  const [editingId, setEditingId] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [type, setType] = useState<AccountDraftType>('bank');
  const [openingBalance, setOpeningBalance] = useState('0.00');

  function resetForm() {
    setEditingId(null);
    setName('');
    setType('bank');
    setOpeningBalance('0.00');
  }

  function startEditing(account: Account) {
    setEditingId(account.id);
    setName(account.name);
    setType(account.type);
    setOpeningBalance(account.openingBalance);
  }

  return (
    <div className="space-y-6">
      <SectionHeader
        eyebrow="Accounts"
        title="Konta"
        description="Pełny CRUD kont per workspace: dodawanie, korekty, archiwizacja i miękkie usuwanie do synchronizacji."
      />

      <section className="rounded-[28px] border border-white/10 bg-stone-950/70 p-5">
        <form
          className="grid gap-4 md:grid-cols-4"
          onSubmit={(event) => {
            event.preventDefault();
            if (!activeWorkspaceId || !activeWorkspace) {
              return;
            }

            if (editingId) {
              const currentAccount = visibleAccounts.find(
                (account) => account.id === editingId,
              );

              if (!currentAccount) {
                return;
              }

              const updatedAccount = updateLocalAccount(currentAccount, {
                name,
                type,
                currency: currentAccount.currency,
                openingBalance,
              });
              const projectedBalance = visibleTransactions
                .filter(
                  (transaction) => transaction.accountId === currentAccount.id,
                )
                .reduce((sum, transaction) => {
                  const amount = Number(transaction.amount);
                  if (transaction.type === 'expense') {
                    return sum - amount;
                  }

                  return sum + amount;
                }, Number(openingBalance));

              void db.accounts
                .put({
                  ...updatedAccount,
                  currentBalanceCached: projectedBalance.toFixed(2),
                })
                .then(() =>
                  enqueueOperation({
                    deviceId: getDeviceId(),
                    workspaceId: activeWorkspaceId,
                    entityType: 'account',
                    entityId: currentAccount.id,
                    operationType: 'update',
                    baseVersion: currentAccount.version,
                    payload: {
                      name: updatedAccount.name,
                      type: updatedAccount.type,
                      currency: updatedAccount.currency,
                      openingBalance: updatedAccount.openingBalance,
                      isArchived: updatedAccount.isArchived,
                    },
                  }),
                )
                .then(() => refreshPendingCount(activeWorkspaceId));

              resetForm();
              return;
            }

            const account = createLocalAccount(activeWorkspaceId, {
              name,
              type,
              currency: activeWorkspace.baseCurrency,
              openingBalance,
            });
            void db.accounts
              .put(account)
              .then(() =>
                enqueueCreateOperation({
                  deviceId: getDeviceId(),
                  workspaceId: activeWorkspaceId,
                  entityType: 'account',
                  entityId: account.id,
                  payload: {
                    name: account.name,
                    type: account.type,
                    currency: account.currency,
                    openingBalance: account.openingBalance,
                  },
                }),
              )
              .then(() => refreshPendingCount(activeWorkspaceId));

            resetForm();
          }}
        >
          <Input
            label="Nazwa"
            name="name"
            value={name}
            onChange={setName}
            placeholder="Konto główne"
          />
          <Select
            label="Typ"
            name="type"
            value={type}
            onChange={(value: string) => setType(value as AccountDraftType)}
            options={accountTypeOptions.map((option) => ({ ...option }))}
          />
          <Input
            label="Saldo początkowe"
            name="openingBalance"
            value={openingBalance}
            onChange={setOpeningBalance}
          />
          <div className="flex flex-col items-stretch gap-2 sm:flex-row sm:items-end">
            <Button type="submit" className="w-full" disabled={!name}>
              {editingId ? 'Zapisz konto' : 'Dodaj konto'}
            </Button>
            {editingId ? (
              <Button variant="ghost" onClick={resetForm}>
                Anuluj
              </Button>
            ) : null}
          </div>
        </form>
      </section>

      {visibleAccounts.length === 0 ? (
        <EmptyState
          title="Brak kont"
          description="Dodaj pierwsze konto. Pojawi się od razu lokalnie i trafi do synchronizacji."
        />
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {visibleAccounts.map((account) => (
            <article
              key={account.id}
              className="rounded-[28px] border border-white/10 bg-stone-950/70 p-5"
            >
              <div className="flex items-start justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2">
                    <p className="font-semibold text-white">{account.name}</p>
                    {account.isArchived ? (
                      <SyncBadge label="Archiwum" tone="warning" />
                    ) : null}
                  </div>
                  <p className="text-sm text-stone-400">{account.type}</p>
                </div>
                <CurrencyAmount
                  value={account.currentBalanceCached}
                  currency={account.currency}
                />
              </div>

              <div className="mt-4 flex flex-wrap gap-2">
                <Button
                  variant="secondary"
                  onClick={() => startEditing(account)}
                >
                  Edytuj
                </Button>
                <Button
                  variant="ghost"
                  onClick={() => {
                    if (!activeWorkspaceId) {
                      return;
                    }

                    const nextAccount = updateLocalAccount(account, {
                      name: account.name,
                      type: account.type,
                      currency: account.currency,
                      openingBalance: account.openingBalance,
                      isArchived: !account.isArchived,
                    });

                    void db.accounts
                      .put(nextAccount)
                      .then(() =>
                        enqueueOperation({
                          deviceId: getDeviceId(),
                          workspaceId: activeWorkspaceId,
                          entityType: 'account',
                          entityId: account.id,
                          operationType: 'update',
                          baseVersion: account.version,
                          payload: {
                            name: nextAccount.name,
                            type: nextAccount.type,
                            currency: nextAccount.currency,
                            openingBalance: nextAccount.openingBalance,
                            isArchived: nextAccount.isArchived,
                          },
                        }),
                      )
                      .then(() => refreshPendingCount(activeWorkspaceId));
                  }}
                >
                  {account.isArchived ? 'Przywróć' : 'Archiwizuj'}
                </Button>
                <Button
                  variant="ghost"
                  onClick={() => {
                    if (!activeWorkspaceId) {
                      return;
                    }

                    if (!window.confirm(`Usunąć konto ${account.name}?`)) {
                      return;
                    }

                    const deletedAccount = deleteLocalAccount(account);
                    void db.accounts
                      .put(deletedAccount)
                      .then(() =>
                        enqueueOperation({
                          deviceId: getDeviceId(),
                          workspaceId: activeWorkspaceId,
                          entityType: 'account',
                          entityId: account.id,
                          operationType: 'delete',
                          baseVersion: account.version,
                          payload: {},
                        }),
                      )
                      .then(() => refreshPendingCount(activeWorkspaceId));

                    if (editingId === account.id) {
                      resetForm();
                    }
                  }}
                >
                  Usuń
                </Button>
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
