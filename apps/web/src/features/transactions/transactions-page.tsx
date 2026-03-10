import type { Account, Category, Transaction } from '@finance/shared-types';
import { Button, CurrencyAmount, EmptyState, SectionHeader } from '@finance/ui';
import { useLiveQuery } from 'dexie-react-hooks';
import { useDeferredValue, useState } from 'react';

import { useAuth } from '../auth/auth-context';
import { useWorkspace } from '../workspaces/workspace-context';
import {
  applyLocalTransactionToAccount,
  enqueueCreateOperation,
  createLocalTransaction,
  db,
  refreshPendingCount,
} from '../../storage/db';
import { getDeviceId } from '../../services/session-store';
import { TransactionForm } from './transaction-form';

export function TransactionsPage() {
  const { user } = useAuth();
  const { activeWorkspaceId } = useWorkspace();
  const accounts =
    useLiveQuery(
      () =>
        activeWorkspaceId
          ? db.accounts.where('workspaceId').equals(activeWorkspaceId).toArray()
          : Promise.resolve([] as Account[]),
      [activeWorkspaceId],
    ) ?? [];
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
    ) ?? [];
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
    ) ?? [];
  const [filter, setFilter] = useState<'all' | 'expense' | 'income'>('all');
  const deferredFilter = useDeferredValue(filter);
  const visibleAccounts = accounts.filter(
    (account) => !account.deletedAt && !account.isArchived,
  );
  const visibleCategories = categories.filter(
    (category) => !category.deletedAt,
  );

  const visibleTransactions = transactions
    .filter((transaction) => !transaction.deletedAt)
    .filter(
      (transaction) =>
        deferredFilter === 'all' || transaction.type === deferredFilter,
    )
    .slice()
    .sort((left, right) =>
      right.transactionDate.localeCompare(left.transactionDate),
    );

  return (
    <div className="space-y-6">
      <SectionHeader
        eyebrow="Money flow"
        title="Transakcje"
        description="Nowe rekordy trafiają najpierw do local DB i outboxa. UI od razu pokazuje wynik, nawet offline."
        action={
          <div className="flex flex-wrap gap-2">
            {(['all', 'expense', 'income'] as const).map((entry) => (
              <Button
                key={entry}
                variant={filter === entry ? 'primary' : 'ghost'}
                onClick={() => setFilter(entry)}
              >
                {entry === 'all'
                  ? 'Wszystkie'
                  : entry === 'expense'
                    ? 'Wydatki'
                    : 'Przychody'}
              </Button>
            ))}
          </div>
        }
      />

      <section className="rounded-[28px] border border-white/10 bg-stone-950/70 p-5">
        <TransactionForm
          accounts={visibleAccounts}
          categories={visibleCategories}
          onSubmit={async (payload) => {
            if (!activeWorkspaceId || !user) {
              return;
            }

            const transaction = createLocalTransaction(
              activeWorkspaceId,
              user.id,
              payload,
            );
            const targetAccount = visibleAccounts.find(
              (account) => account.id === transaction.accountId,
            );

            await db.transaction(
              'rw',
              [db.transactions, db.accounts],
              async () => {
                await db.transactions.put(transaction);

                if (targetAccount) {
                  await db.accounts.put(
                    applyLocalTransactionToAccount(targetAccount, transaction),
                  );
                }
              },
            );

            await enqueueCreateOperation({
              deviceId: getDeviceId(),
              workspaceId: activeWorkspaceId,
              entityType: 'transaction',
              entityId: transaction.id,
              payload,
            });
            await refreshPendingCount(activeWorkspaceId);
          }}
        />
      </section>

      <section className="space-y-3">
        {visibleTransactions.length === 0 ? (
          <EmptyState
            title="Brak dopasowanych transakcji"
            description="Zmodyfikuj filtr albo dodaj nową transakcję. Zapis lokalny nie wymaga połączenia."
          />
        ) : (
          visibleTransactions.map((transaction) => (
            <article
              key={transaction.id}
              className="rounded-[28px] border border-white/10 bg-stone-950/70 px-5 py-4"
            >
              <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                <div>
                  <p className="font-semibold text-white">
                    {transaction.description || 'Bez opisu'}
                  </p>
                  <p className="text-sm text-stone-400">
                    {transaction.transactionDate} · {transaction.type}
                  </p>
                </div>
                <CurrencyAmount
                  value={transaction.amount}
                  currency={transaction.currency}
                  className={
                    transaction.type === 'expense'
                      ? 'text-rose-300'
                      : 'text-lime-200'
                  }
                />
              </div>
            </article>
          ))
        )}
      </section>
    </div>
  );
}
