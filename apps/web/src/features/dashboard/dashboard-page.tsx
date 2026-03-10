import type { Account, BudgetLimit, Transaction } from '@finance/shared-types';
import type { ReactNode } from 'react';

import { CurrencyAmount, EmptyState, SectionHeader } from '@finance/ui';
import { useLiveQuery } from 'dexie-react-hooks';

import { useWorkspace } from '../workspaces/workspace-context';
import { db } from '../../storage/db';

export function DashboardPage() {
  const { activeWorkspaceId } = useWorkspace();
  const accounts = useLiveQuery(
    () =>
      activeWorkspaceId
        ? db.accounts.where('workspaceId').equals(activeWorkspaceId).toArray()
        : Promise.resolve([] as Account[]),
    [activeWorkspaceId],
  ) ?? [];
  const transactions = useLiveQuery(
    () =>
      activeWorkspaceId
        ? db.transactions.where('workspaceId').equals(activeWorkspaceId).reverse().sortBy('transactionDate')
        : Promise.resolve([] as Transaction[]),
    [activeWorkspaceId],
  ) ?? [];
  const budgetLimits = useLiveQuery(
    () =>
      activeWorkspaceId
        ? db.budgetLimits.where('workspaceId').equals(activeWorkspaceId).toArray()
        : Promise.resolve([] as BudgetLimit[]),
    [activeWorkspaceId],
  ) ?? [];

  const monthPrefix = new Date().toISOString().slice(0, 7);
  const monthTransactions = transactions.filter((transaction) => transaction.transactionDate.startsWith(monthPrefix));
  const income = monthTransactions
    .filter((transaction) => transaction.type === 'income')
    .reduce((sum, transaction) => sum + Number(transaction.amount), 0);
  const expenses = monthTransactions
    .filter((transaction) => transaction.type === 'expense')
    .reduce((sum, transaction) => sum + Number(transaction.amount), 0);
  const totalBalance = accounts.reduce((sum, account) => sum + Number(account.currentBalanceCached), 0);
  const budgetSpend = monthTransactions
    .filter((transaction) => transaction.type === 'expense')
    .reduce((sum, transaction) => sum + Number(transaction.amount), 0);
  const budgetTotal = budgetLimits.reduce((sum, limit) => sum + Number(limit.amount), 0);
  const budgetUsage = budgetTotal > 0 ? Math.round((budgetSpend / budgetTotal) * 100) : 0;

  return (
    <div className="space-y-6">
      <SectionHeader
        eyebrow="Overview"
        title="Dashboard"
        description="Najważniejsze liczby dla aktywnego workspace’u, zawsze z lokalnego snapshotu."
      />

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <MetricCard label="Łączne saldo" value={<CurrencyAmount value={String(totalBalance)} currency="PLN" className="text-3xl" />} />
        <MetricCard label="Przychody miesiąca" value={<CurrencyAmount value={String(income)} currency="PLN" className="text-3xl" />} />
        <MetricCard label="Wydatki miesiąca" value={<CurrencyAmount value={String(expenses)} currency="PLN" className="text-3xl" />} />
        <MetricCard label="Wykorzystanie budżetu" value={<span className="text-3xl font-bold text-white">{budgetUsage}%</span>} />
      </div>

      <div className="grid gap-4 xl:grid-cols-[1.4fr_0.9fr]">
        <section className="rounded-[28px] border border-white/10 bg-stone-950/70 p-5">
          <SectionHeader
            eyebrow="Recent"
            title="Ostatnie transakcje"
            description="Szybki podgląd ostatnich zapisów z local DB."
          />

          <div className="mt-5 space-y-3">
            {transactions.length === 0 ? (
              <EmptyState
                title="Brak transakcji"
                description="Dodaj pierwszą operację w zakładce Transakcje. Zapisze się lokalnie, nawet offline."
              />
            ) : (
              transactions
                .slice()
                .sort((left, right) => right.transactionDate.localeCompare(left.transactionDate))
                .slice(0, 6)
                .map((transaction) => (
                  <div
                    key={transaction.id}
                    className="flex items-center justify-between rounded-[22px] border border-white/10 bg-white/5 px-4 py-3"
                  >
                    <div>
                      <p className="font-semibold text-white">{transaction.description || 'Bez opisu'}</p>
                      <p className="text-sm text-stone-400">{transaction.transactionDate}</p>
                    </div>
                    <CurrencyAmount
                      value={transaction.amount}
                      currency={transaction.currency}
                      className={transaction.type === 'expense' ? 'text-rose-300' : 'text-lime-200'}
                    />
                  </div>
                ))
            )}
          </div>
        </section>

        <section className="rounded-[28px] border border-white/10 bg-stone-950/70 p-5">
          <SectionHeader
            eyebrow="Accounts"
            title="Saldo kont"
            description="Balans per konto po lokalnych i zsynchronizowanych zmianach."
          />

          <div className="mt-5 space-y-3">
            {accounts.map((account) => (
              <div key={account.id} className="rounded-[22px] border border-white/10 bg-white/5 px-4 py-3">
                <div className="flex items-center justify-between">
                  <p className="font-semibold text-white">{account.name}</p>
                  <CurrencyAmount value={account.currentBalanceCached} currency={account.currency} />
                </div>
                <p className="mt-1 text-sm text-stone-400">{account.type}</p>
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}

function MetricCard({ label, value }: { label: string; value: ReactNode }) {
  return (
    <article className="rounded-[28px] border border-white/10 bg-stone-950/70 p-5 shadow-halo">
      <p className="text-sm text-stone-400">{label}</p>
      <div className="mt-4 font-display font-bold text-white">{value}</div>
    </article>
  );
}
