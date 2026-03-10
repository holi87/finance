import type { BudgetLimit, BudgetPeriod, Category, Transaction } from '@finance/shared-types';
import { Button, CurrencyAmount, EmptyState, Input, SectionHeader, Select } from '@finance/ui';
import { useLiveQuery } from 'dexie-react-hooks';
import { useState } from 'react';

import { useWorkspace } from '../workspaces/workspace-context';
import {
  createLocalBudgetLimit,
  createLocalBudgetPeriod,
  db,
  enqueueCreateOperation,
  refreshPendingCount,
} from '../../storage/db';
import { getDeviceId } from '../../services/session-store';

export function BudgetsPage() {
  const { activeWorkspaceId } = useWorkspace();
  const budgetPeriods = useLiveQuery(
    () =>
      activeWorkspaceId
        ? db.budgetPeriods.where('workspaceId').equals(activeWorkspaceId).toArray()
        : Promise.resolve([] as BudgetPeriod[]),
    [activeWorkspaceId],
  ) ?? [];
  const budgetLimits = useLiveQuery(
    () =>
      activeWorkspaceId
        ? db.budgetLimits.where('workspaceId').equals(activeWorkspaceId).toArray()
        : Promise.resolve([] as BudgetLimit[]),
    [activeWorkspaceId],
  ) ?? [];
  const categories = useLiveQuery(
    () =>
      activeWorkspaceId
        ? db.categories.where('workspaceId').equals(activeWorkspaceId).toArray()
        : Promise.resolve([] as Category[]),
    [activeWorkspaceId],
  ) ?? [];
  const transactions = useLiveQuery(
    () =>
      activeWorkspaceId
        ? db.transactions.where('workspaceId').equals(activeWorkspaceId).toArray()
        : Promise.resolve([] as Transaction[]),
    [activeWorkspaceId],
  ) ?? [];
  const [startsAt, setStartsAt] = useState(new Date().toISOString().slice(0, 8) + '01');
  const [endsAt, setEndsAt] = useState(new Date().toISOString().slice(0, 8) + '31');
  const [budgetPeriodId, setBudgetPeriodId] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [amount, setAmount] = useState('0.00');

  const limitsWithUsage = budgetLimits.map((limit) => {
    const period = budgetPeriods.find((entry) => entry.id === limit.budgetPeriodId);
    const category = categories.find((entry) => entry.id === limit.categoryId);
    const spent = transactions
      .filter((transaction) => transaction.categoryId === limit.categoryId && transaction.type === 'expense')
      .filter((transaction) => {
        if (!period) {
          return false;
        }
        return transaction.transactionDate >= period.startsAt && transaction.transactionDate <= period.endsAt;
      })
      .reduce((sum, transaction) => sum + Number(transaction.amount), 0);

    return { limit, period, category, spent };
  });

  return (
    <div className="space-y-6">
      <SectionHeader eyebrow="Planning" title="Budżety" description="Limity kategorii i wykorzystanie w aktualnym okresie, zasilane lokalnymi transakcjami." />

      <div className="grid gap-4 lg:grid-cols-2">
        <section className="rounded-[28px] border border-white/10 bg-stone-950/70 p-5">
          <h3 className="font-display text-xl font-semibold text-white">Nowy okres budżetowy</h3>
          <form
            className="mt-4 grid gap-4 md:grid-cols-3"
            onSubmit={(event) => {
              event.preventDefault();
            if (!activeWorkspaceId) {
              return;
            }
            const period = createLocalBudgetPeriod(activeWorkspaceId, { startsAt, endsAt });
            void db.budgetPeriods
              .put(period)
              .then(() =>
                enqueueCreateOperation({
                  deviceId: getDeviceId(),
                  workspaceId: activeWorkspaceId,
                  entityType: 'budgetPeriod',
                  entityId: period.id,
                  payload: {
                    periodType: 'monthly',
                    startsAt: period.startsAt,
                    endsAt: period.endsAt,
                  },
                }),
              )
              .then(() => refreshPendingCount(activeWorkspaceId));
            setBudgetPeriodId(period.id);
          }}
        >
            <Input label="Start" name="startsAt" type="date" value={startsAt} onChange={setStartsAt} />
            <Input label="Koniec" name="endsAt" type="date" value={endsAt} onChange={setEndsAt} />
            <div className="flex items-end">
              <Button type="submit" className="w-full">
                Dodaj okres
              </Button>
            </div>
          </form>
        </section>

        <section className="rounded-[28px] border border-white/10 bg-stone-950/70 p-5">
          <h3 className="font-display text-xl font-semibold text-white">Nowy limit</h3>
          <form
            className="mt-4 grid gap-4 md:grid-cols-2"
            onSubmit={(event) => {
              event.preventDefault();
              if (!activeWorkspaceId || !budgetPeriodId || !categoryId) {
                return;
              }
              const limit = createLocalBudgetLimit(activeWorkspaceId, {
                budgetPeriodId,
                categoryId,
                amount,
                currency: 'PLN',
              });
              void db.budgetLimits
                .put(limit)
                .then(() =>
                  enqueueCreateOperation({
                    deviceId: getDeviceId(),
                    workspaceId: activeWorkspaceId,
                    entityType: 'budgetLimit',
                    entityId: limit.id,
                    payload: {
                      budgetPeriodId,
                      categoryId,
                      amount,
                      currency: 'PLN',
                    },
                  }),
                )
                .then(() => refreshPendingCount(activeWorkspaceId));
            }}
          >
            <Select
              label="Okres"
              name="budgetPeriodId"
              value={budgetPeriodId}
              onChange={setBudgetPeriodId}
              options={budgetPeriods.map((period) => ({
                label: `${period.startsAt} → ${period.endsAt}`,
                value: period.id,
              }))}
            />
            <Select
              label="Kategoria"
              name="categoryId"
              value={categoryId}
              onChange={setCategoryId}
              options={categories.map((category) => ({
                label: category.name,
                value: category.id,
              }))}
            />
            <Input label="Kwota" name="amount" value={amount} onChange={setAmount} />
            <div className="flex items-end">
              <Button type="submit" className="w-full" disabled={!budgetPeriodId || !categoryId}>
                Dodaj limit
              </Button>
            </div>
          </form>
        </section>
      </div>

      {limitsWithUsage.length === 0 ? (
        <EmptyState title="Brak limitów" description="Dodaj okres i limit kategorii, aby śledzić wykonanie budżetu." />
      ) : (
        <div className="grid gap-4 xl:grid-cols-2">
          {limitsWithUsage.map(({ limit, period, category, spent }) => {
            const progress = Number(limit.amount) > 0 ? Math.round((spent / Number(limit.amount)) * 100) : 0;
            return (
              <article key={limit.id} className="rounded-[28px] border border-white/10 bg-stone-950/70 p-5">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="font-semibold text-white">{category?.name ?? 'Kategoria'}</p>
                    <p className="text-sm text-stone-400">
                      {period?.startsAt} → {period?.endsAt}
                    </p>
                  </div>
                  <span className="rounded-full bg-white/10 px-3 py-1 text-xs font-semibold text-stone-300">
                    {progress}%
                  </span>
                </div>
                <div className="mt-4 flex items-center justify-between">
                  <CurrencyAmount value={String(spent)} currency={limit.currency} />
                  <CurrencyAmount value={limit.amount} currency={limit.currency} className="text-stone-400" />
                </div>
                <div className="mt-4 h-2 rounded-full bg-white/10">
                  <div
                    className={`h-2 rounded-full ${progress > 100 ? 'bg-rose-300' : progress > 80 ? 'bg-amber-300' : 'bg-lime-300'}`}
                    style={{ width: `${Math.min(progress, 100)}%` }}
                  />
                </div>
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}
