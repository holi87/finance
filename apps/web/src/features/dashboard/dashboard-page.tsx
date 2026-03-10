import type {
  Account,
  BudgetLimit,
  BudgetPeriod,
  Category,
  Transaction,
  WorkspaceType,
} from '@finance/shared-types';
import type { ReactNode } from 'react';

import {
  Button,
  CurrencyAmount,
  EmptyState,
  SectionHeader,
  SyncBadge,
} from '@finance/ui';
import { useLiveQuery } from 'dexie-react-hooks';
import { useMemo, useState } from 'react';

import {
  buildCashflowSeries,
  filterTransactionsInRange,
  findRelevantBudgetPeriod,
  getMonthRange,
  summarizeTransactions,
  type CashflowBucket,
  type TrendGranularity,
} from '../../services/finance-metrics';
import { db } from '../../storage/db';
import { useWorkspace } from '../workspaces/workspace-context';

const EMPTY_ACCOUNTS: Account[] = [];
const EMPTY_TRANSACTIONS: Transaction[] = [];
const EMPTY_BUDGET_LIMITS: BudgetLimit[] = [];
const EMPTY_BUDGET_PERIODS: BudgetPeriod[] = [];
const EMPTY_CATEGORIES: Category[] = [];

const trendOptions: Array<{
  label: string;
  value: TrendGranularity;
}> = [
  { label: 'Dzień', value: 'day' },
  { label: 'Tydzień', value: 'week' },
  { label: 'Miesiąc', value: 'month' },
];

const trendBucketCount: Record<TrendGranularity, number> = {
  day: 7,
  week: 8,
  month: 6,
};

export function DashboardPage() {
  const { activeWorkspaceId, activeWorkspace } = useWorkspace();
  const [trendGranularity, setTrendGranularity] =
    useState<TrendGranularity>('week');

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
  const budgetLimits =
    useLiveQuery(
      () =>
        activeWorkspaceId
          ? db.budgetLimits
              .where('workspaceId')
              .equals(activeWorkspaceId)
              .toArray()
          : Promise.resolve([] as BudgetLimit[]),
      [activeWorkspaceId],
    ) ?? EMPTY_BUDGET_LIMITS;
  const budgetPeriods =
    useLiveQuery(
      () =>
        activeWorkspaceId
          ? db.budgetPeriods
              .where('workspaceId')
              .equals(activeWorkspaceId)
              .toArray()
          : Promise.resolve([] as BudgetPeriod[]),
      [activeWorkspaceId],
    ) ?? EMPTY_BUDGET_PERIODS;
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

  const visibleAccounts = useMemo(
    () => accounts.filter((account) => !account.deletedAt),
    [accounts],
  );
  const visibleTransactions = useMemo(
    () => transactions.filter((transaction) => !transaction.deletedAt),
    [transactions],
  );
  const visibleBudgetLimits = useMemo(
    () => budgetLimits.filter((limit) => !limit.deletedAt),
    [budgetLimits],
  );
  const visibleBudgetPeriods = useMemo(
    () =>
      budgetPeriods
        .slice()
        .sort((left, right) => right.startsAt.localeCompare(left.startsAt)),
    [budgetPeriods],
  );
  const visibleCategories = useMemo(
    () => categories.filter((category) => !category.deletedAt),
    [categories],
  );

  if (!activeWorkspace) {
    return (
      <EmptyState
        title="Brak aktywnego workspace’u"
        description="Wybierz workspace, aby zobaczyć właściwy pulpit dla domu, JDG lub firmy."
      />
    );
  }

  const today = new Date().toISOString().slice(0, 10);
  const currency = activeWorkspace.baseCurrency;
  const currentMonthRange = getMonthRange(today);
  const previousMonthRange = getMonthRange(today, -1);
  const currentMonthTransactions = filterTransactionsInRange(
    visibleTransactions,
    currentMonthRange.startsAt,
    currentMonthRange.endsAt,
  );
  const previousMonthTransactions = filterTransactionsInRange(
    visibleTransactions,
    previousMonthRange.startsAt,
    previousMonthRange.endsAt,
  );
  const currentMonthSummary = summarizeTransactions(currentMonthTransactions);
  const previousMonthSummary = summarizeTransactions(previousMonthTransactions);
  const activeBudgetPeriod = findRelevantBudgetPeriod(
    visibleBudgetPeriods,
    today,
  );
  const activeBudgetTransactions = activeBudgetPeriod
    ? filterTransactionsInRange(
        visibleTransactions,
        activeBudgetPeriod.startsAt,
        activeBudgetPeriod.endsAt,
      )
    : currentMonthTransactions;
  const activeBudgetLimits = activeBudgetPeriod
    ? visibleBudgetLimits.filter(
        (limit) => limit.budgetPeriodId === activeBudgetPeriod.id,
      )
    : [];
  const budgetTotal = activeBudgetLimits.reduce(
    (sum, limit) => sum + Number(limit.amount),
    0,
  );
  const budgetSpent = activeBudgetTransactions
    .filter((transaction) => transaction.type === 'expense')
    .reduce((sum, transaction) => sum + Number(transaction.amount), 0);
  const budgetRemaining = budgetTotal - budgetSpent;
  const budgetUsage =
    budgetTotal > 0 ? Math.round((budgetSpent / budgetTotal) * 100) : 0;
  const totalBalance = visibleAccounts.reduce(
    (sum, account) => sum + Number(account.currentBalanceCached),
    0,
  );
  const averageExpense =
    currentMonthSummary.expenses > 0
      ? currentMonthSummary.expenses /
        Math.max(
          1,
          currentMonthTransactions.filter(
            (transaction) => transaction.type === 'expense',
          ).length,
        )
      : 0;
  const largestExpense =
    currentMonthTransactions
      .filter((transaction) => transaction.type === 'expense')
      .reduce<Transaction | null>((largest, transaction) => {
        if (!largest || Number(transaction.amount) > Number(largest.amount)) {
          return transaction;
        }

        return largest;
      }, null) ?? null;
  const monthlyCategorySpend = visibleCategories
    .map((category) => {
      const spent = currentMonthTransactions
        .filter(
          (transaction) =>
            transaction.type === 'expense' &&
            transaction.categoryId === category.id,
        )
        .reduce((sum, transaction) => sum + Number(transaction.amount), 0);

      return {
        category,
        spent,
      };
    })
    .filter((entry) => entry.spent > 0)
    .sort((left, right) => right.spent - left.spent)
    .slice(0, 4);
  const budgetBreakdown = activeBudgetLimits
    .map((limit) => {
      const category = visibleCategories.find(
        (entry) => entry.id === limit.categoryId,
      );

      if (!category) {
        return null;
      }

      const spent = activeBudgetTransactions
        .filter(
          (transaction) =>
            transaction.type === 'expense' &&
            transaction.categoryId === limit.categoryId,
        )
        .reduce((sum, transaction) => sum + Number(transaction.amount), 0);
      const total = Number(limit.amount);
      const remaining = total - spent;
      const progress = total > 0 ? Math.round((spent / total) * 100) : 0;

      return {
        limit,
        category,
        spent,
        remaining,
        progress,
      };
    })
    .filter(
      (
        entry,
      ): entry is {
        limit: BudgetLimit;
        category: Category;
        spent: number;
        remaining: number;
        progress: number;
      } => entry !== null,
    )
    .sort((left, right) => right.spent - left.spent)
    .slice(0, 4);
  const trendSeries = buildCashflowSeries(
    visibleTransactions,
    trendGranularity,
    trendBucketCount[trendGranularity],
    today,
  );
  const currentMonthNetDelta =
    currentMonthSummary.net - previousMonthSummary.net;

  const lens = buildWorkspaceLens(activeWorkspace.type, {
    currency,
    totalBalance,
    income: currentMonthSummary.income,
    expenses: currentMonthSummary.expenses,
    cashflow: currentMonthSummary.net,
    budgetUsage,
    budgetRemaining,
    averageExpense,
    largestExpenseAmount: largestExpense ? Number(largestExpense.amount) : 0,
    transactionCount: currentMonthTransactions.length,
    accountCount: visibleAccounts.length,
  });

  return (
    <div className="space-y-6">
      <SectionHeader
        eyebrow={lens.eyebrow}
        title={lens.title}
        description={lens.description}
        action={
          activeBudgetPeriod ? (
            <SyncBadge
              label={`Budżet: ${activeBudgetPeriod.startsAt} → ${activeBudgetPeriod.endsAt}`}
              tone="neutral"
            />
          ) : null
        }
      />

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {lens.metrics.map((metric) => (
          <MetricCard
            key={metric.label}
            label={metric.label}
            value={metric.value}
          />
        ))}
      </div>

      <section className="rounded-[28px] border border-white/10 bg-stone-950/70 p-5">
        <SectionHeader
          eyebrow="Trend"
          title="Historia cashflow"
          description="Zobacz ile w kolejnych dniach, tygodniach i miesiącach wpadało oraz wypływało z aktywnego workspace’u."
          action={
            <div className="flex flex-wrap gap-2">
              {trendOptions.map((option) => (
                <Button
                  key={option.value}
                  variant={
                    trendGranularity === option.value ? 'primary' : 'ghost'
                  }
                  onClick={() => setTrendGranularity(option.value)}
                >
                  {option.label}
                </Button>
              ))}
            </div>
          }
        />

        <div className="mt-5 grid gap-4 xl:grid-cols-[1.15fr_0.85fr]">
          <CashflowChart series={trendSeries} currency={currency} />

          <div className="grid gap-4 md:grid-cols-3 xl:grid-cols-1">
            <MetricCard
              label={
                currentMonthSummary.net >= 0
                  ? 'Miesiąc na plus'
                  : 'Miesiąc na minus'
              }
              value={
                <CurrencyAmount
                  value={String(Math.abs(currentMonthSummary.net))}
                  currency={currency}
                  className="text-3xl"
                />
              }
            />
            <MetricCard
              label={
                currentMonthNetDelta >= 0
                  ? 'Zmiana vs poprzedni miesiąc'
                  : 'Spadek vs poprzedni miesiąc'
              }
              value={
                <CurrencyAmount
                  value={String(Math.abs(currentMonthNetDelta))}
                  currency={currency}
                  className="text-3xl"
                />
              }
            />
            <MetricCard
              label="Budżet bieżącego okresu"
              value={
                activeBudgetPeriod ? (
                  <CurrencyAmount
                    value={String(Math.abs(budgetRemaining))}
                    currency={currency}
                    className="text-3xl"
                  />
                ) : (
                  <span className="text-3xl font-bold text-white">Brak</span>
                )
              }
            />
          </div>
        </div>
      </section>

      <div className="grid gap-4 xl:grid-cols-[0.95fr_1.05fr]">
        <section className="rounded-[28px] border border-white/10 bg-stone-950/70 p-5">
          <SectionHeader
            eyebrow="Budget"
            title="Stan budżetu"
            description={
              activeBudgetPeriod
                ? 'Transakcje kosztowe są od razu liczone do aktywnego okresu i pokazują gdzie budżet siada najszybciej.'
                : 'Dodaj okres i limity kategorii, aby śledzić budżet w czasie rzeczywistym.'
            }
          />

          {activeBudgetPeriod ? (
            <>
              <div className="mt-5 grid gap-3 md:grid-cols-3">
                <BudgetTile
                  label="Zaplanowano"
                  value={
                    <CurrencyAmount
                      value={String(budgetTotal)}
                      currency={currency}
                    />
                  }
                />
                <BudgetTile
                  label="Wydano"
                  value={
                    <CurrencyAmount
                      value={String(budgetSpent)}
                      currency={currency}
                    />
                  }
                />
                <BudgetTile
                  label={budgetRemaining >= 0 ? 'Pozostało' : 'Ponad limit'}
                  value={
                    <CurrencyAmount
                      value={String(Math.abs(budgetRemaining))}
                      currency={currency}
                    />
                  }
                />
              </div>

              <div className="mt-6 space-y-3">
                {budgetBreakdown.length === 0 ? (
                  <EmptyState
                    title="Brak limitów w aktywnym okresie"
                    description="Dodaj limity kategorii w zakładce Budżety, aby transakcje zaczęły konsumować budżet."
                  />
                ) : (
                  budgetBreakdown.map((entry) => (
                    <div
                      key={entry.limit.id}
                      className="rounded-[22px] border border-white/10 bg-white/5 px-4 py-4"
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <p className="font-semibold text-white">
                            {entry.category.name}
                          </p>
                          <p className="text-sm text-stone-400">
                            {entry.progress}% wykorzystania
                          </p>
                        </div>
                        <CurrencyAmount
                          value={String(entry.spent)}
                          currency={entry.limit.currency}
                        />
                      </div>
                      <div className="mt-4 h-2 rounded-full bg-white/10">
                        <div
                          className={`h-2 rounded-full ${
                            entry.progress > 100
                              ? 'bg-rose-300'
                              : entry.progress > 80
                                ? 'bg-amber-300'
                                : 'bg-lime-300'
                          }`}
                          style={{ width: `${Math.min(entry.progress, 100)}%` }}
                        />
                      </div>
                      <div className="mt-3 flex items-center justify-between text-sm text-stone-400">
                        <span>
                          Limit:{' '}
                          <CurrencyAmount
                            value={entry.limit.amount}
                            currency={entry.limit.currency}
                          />
                        </span>
                        <span>
                          {entry.remaining >= 0 ? 'Zostało' : 'Ponad limit'}:{' '}
                          <CurrencyAmount
                            value={String(Math.abs(entry.remaining))}
                            currency={entry.limit.currency}
                          />
                        </span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </>
          ) : (
            <div className="mt-5">
              <EmptyState
                title="Brak aktywnego okresu budżetowego"
                description="Dodaj okres w zakładce Budżety. Wtedy wydatki zaczną obciążać konkretny plan."
              />
            </div>
          )}
        </section>

        <section className="rounded-[28px] border border-white/10 bg-stone-950/70 p-5">
          <SectionHeader
            eyebrow="Month"
            title="Miesiąc w liczbach"
            description="Najmocniejsze kategorie i ostatnie zapisy z bieżącego miesiąca."
          />

          <div className="mt-5 space-y-3">
            <p className="text-xs uppercase tracking-[0.3em] text-lime-300">
              Top kategorie miesiąca
            </p>
            {monthlyCategorySpend.length === 0 ? (
              <EmptyState
                title="Brak wydatków w kategoriach"
                description="Dodaj transakcje kosztowe, aby zobaczyć co dominuje w tym workspace’ie."
              />
            ) : (
              monthlyCategorySpend.map(({ category, spent }) => (
                <div
                  key={category.id}
                  className="flex items-center justify-between rounded-[22px] border border-white/10 bg-white/5 px-4 py-3"
                >
                  <div className="flex items-center gap-3">
                    <span
                      className="h-3 w-3 rounded-full"
                      style={{ backgroundColor: category.color ?? '#bef264' }}
                    />
                    <div>
                      <p className="font-semibold text-white">
                        {category.name}
                      </p>
                      <p className="text-sm text-stone-400">{category.kind}</p>
                    </div>
                  </div>
                  <CurrencyAmount value={String(spent)} currency={currency} />
                </div>
              ))
            )}
          </div>

          <div className="mt-6 space-y-3">
            <p className="text-xs uppercase tracking-[0.3em] text-lime-300">
              Ostatnie transakcje
            </p>
            {visibleTransactions.length === 0 ? (
              <EmptyState
                title="Brak transakcji"
                description="Dodaj pierwszą operację w zakładce Transakcje. Zapisze się lokalnie, nawet offline."
              />
            ) : (
              visibleTransactions
                .slice()
                .sort((left, right) =>
                  right.transactionDate.localeCompare(left.transactionDate),
                )
                .slice(0, 5)
                .map((transaction) => (
                  <div
                    key={transaction.id}
                    className="flex items-center justify-between rounded-[22px] border border-white/10 bg-white/5 px-4 py-3"
                  >
                    <div>
                      <p className="font-semibold text-white">
                        {transaction.description || 'Bez opisu'}
                      </p>
                      <p className="text-sm text-stone-400">
                        {transaction.transactionDate}
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
                ))
            )}
          </div>
        </section>
      </div>

      <section className="rounded-[28px] border border-white/10 bg-stone-950/70 p-5">
        <SectionHeader
          eyebrow="Accounts"
          title="Saldo kont"
          description="Saldo zmienia się lokalnie już po zapisaniu transakcji, bez czekania na synchronizację."
        />

        <div className="mt-5 grid gap-3 md:grid-cols-2">
          {visibleAccounts.length === 0 ? (
            <EmptyState
              title="Brak kont"
              description="Dodaj konto w zakładce Konta, aby pulpit miał pełny obraz salda."
            />
          ) : (
            visibleAccounts.map((account) => (
              <div
                key={account.id}
                className="rounded-[22px] border border-white/10 bg-white/5 px-4 py-3"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-semibold text-white">{account.name}</p>
                    <p className="text-sm text-stone-400">{account.type}</p>
                  </div>
                  <CurrencyAmount
                    value={account.currentBalanceCached}
                    currency={account.currency}
                  />
                </div>
              </div>
            ))
          )}
        </div>
      </section>
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

function BudgetTile({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="rounded-[22px] border border-white/10 bg-white/5 px-4 py-4">
      <p className="text-xs uppercase tracking-[0.2em] text-stone-500">
        {label}
      </p>
      <div className="mt-2 font-semibold text-white">{value}</div>
    </div>
  );
}

function CashflowChart({
  series,
  currency,
}: {
  series: CashflowBucket[];
  currency: string;
}) {
  const highestValue = Math.max(
    1,
    ...series.map((bucket) => Math.max(bucket.income, bucket.expenses)),
  );
  const hasData = series.some(
    (bucket) => bucket.income > 0 || bucket.expenses > 0,
  );
  const summary = {
    income: series.reduce((sum, bucket) => sum + bucket.income, 0),
    expenses: series.reduce((sum, bucket) => sum + bucket.expenses, 0),
    net: series.reduce((sum, bucket) => sum + bucket.net, 0),
  };

  if (!hasData) {
    return (
      <EmptyState
        title="Brak historii do wykresu"
        description="Dodaj kilka transakcji, a pojawi się trend dzienny, tygodniowy i miesięczny."
      />
    );
  }

  return (
    <div className="rounded-[24px] border border-white/10 bg-white/5 p-4">
      <div className="grid gap-3 md:grid-cols-3">
        <BudgetTile
          label="Wpływy"
          value={
            <CurrencyAmount
              value={String(summary.income)}
              currency={currency}
            />
          }
        />
        <BudgetTile
          label="Wydatki"
          value={
            <CurrencyAmount
              value={String(summary.expenses)}
              currency={currency}
            />
          }
        />
        <BudgetTile
          label={summary.net >= 0 ? 'Netto +' : 'Netto -'}
          value={
            <CurrencyAmount
              value={String(Math.abs(summary.net))}
              currency={currency}
            />
          }
        />
      </div>

      <div
        className="mt-5 grid gap-2"
        style={{
          gridTemplateColumns: `repeat(${series.length}, minmax(0, 1fr))`,
        }}
      >
        {series.map((bucket) => (
          <div key={bucket.key} className="flex flex-col gap-2">
            <div className="flex h-40 items-end justify-center gap-2 rounded-[22px] border border-white/10 bg-stone-950/70 px-2 py-3">
              <div className="flex h-full w-full items-end gap-1">
                <div
                  className="w-1/2 rounded-t-2xl bg-lime-300"
                  style={{
                    height: `${Math.max((bucket.income / highestValue) * 100, bucket.income > 0 ? 8 : 0)}%`,
                  }}
                  title={`Wpływy: ${bucket.income}`}
                />
                <div
                  className="w-1/2 rounded-t-2xl bg-rose-300"
                  style={{
                    height: `${Math.max((bucket.expenses / highestValue) * 100, bucket.expenses > 0 ? 8 : 0)}%`,
                  }}
                  title={`Wydatki: ${bucket.expenses}`}
                />
              </div>
            </div>
            <div className="text-center">
              <p className="text-xs font-semibold uppercase tracking-[0.15em] text-stone-400">
                {bucket.label}
              </p>
              <p className="mt-1 text-[11px] text-stone-500">
                {bucket.rangeLabel}
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function buildWorkspaceLens(
  type: WorkspaceType,
  params: {
    currency: string;
    totalBalance: number;
    income: number;
    expenses: number;
    cashflow: number;
    budgetUsage: number;
    budgetRemaining: number;
    averageExpense: number;
    largestExpenseAmount: number;
    transactionCount: number;
    accountCount: number;
  },
) {
  const sharedMetrics = {
    balance: (
      <CurrencyAmount
        value={String(params.totalBalance)}
        currency={params.currency}
        className="text-3xl"
      />
    ),
    income: (
      <CurrencyAmount
        value={String(params.income)}
        currency={params.currency}
        className="text-3xl"
      />
    ),
    expenses: (
      <CurrencyAmount
        value={String(params.expenses)}
        currency={params.currency}
        className="text-3xl"
      />
    ),
    budgetUsage: (
      <span className="text-3xl font-bold text-white">
        {params.budgetUsage}%
      </span>
    ),
    averageExpense: (
      <CurrencyAmount
        value={String(params.averageExpense)}
        currency={params.currency}
        className="text-2xl"
      />
    ),
    budgetRemaining: (
      <CurrencyAmount
        value={String(Math.abs(params.budgetRemaining))}
        currency={params.currency}
        className="text-2xl"
      />
    ),
    cashflow: (
      <CurrencyAmount
        value={String(params.cashflow)}
        currency={params.currency}
        className="text-2xl"
      />
    ),
    largestExpense: (
      <CurrencyAmount
        value={String(params.largestExpenseAmount)}
        currency={params.currency}
        className="text-2xl"
      />
    ),
  };

  if (type === 'business') {
    const taxReserve = Math.max(params.cashflow, 0) * 0.19;
    const runwayMonths =
      params.expenses > 0 ? params.totalBalance / params.expenses : 0;

    return {
      eyebrow: 'JDG',
      title: 'Pulpit właściciela działalności',
      description:
        'Widok pod cashflow, koszty operacyjne i bufor podatkowy dla jednoosobowej działalności.',
      metrics: [
        { label: 'Saldo operacyjne', value: sharedMetrics.balance },
        { label: 'Przychód miesiąca', value: sharedMetrics.income },
        { label: 'Koszty miesiąca', value: sharedMetrics.expenses },
        {
          label: 'Rezerwa podatkowa',
          value: (
            <CurrencyAmount
              value={String(taxReserve)}
              currency={params.currency}
              className="text-3xl"
            />
          ),
        },
      ],
      focusTitle: 'Cockpit JDG',
      focusDescription:
        'Najważniejsze sygnały dla działalności: czy przychód rośnie szybciej niż koszty i ile masz bufora na kolejne miesiące.',
      highlights: [
        { label: 'Cashflow', value: sharedMetrics.cashflow },
        {
          label: 'Runway',
          value: (
            <span>
              {runwayMonths > 0 ? runwayMonths.toFixed(1) : '0.0'} mies.
            </span>
          ),
        },
        { label: 'Średni koszt', value: sharedMetrics.averageExpense },
      ],
    };
  }

  if (type === 'company') {
    const margin =
      params.income > 0
        ? Math.round((params.cashflow / params.income) * 100)
        : 0;

    return {
      eyebrow: 'Firma',
      title: 'Pulpit finansowy firmy',
      description:
        'Widok zarządczy pod przychód, koszty, budżet i marżę operacyjną w kontekście firmowym.',
      metrics: [
        { label: 'Kapitał roboczy', value: sharedMetrics.balance },
        { label: 'Przychody miesiąca', value: sharedMetrics.income },
        { label: 'Koszty operacyjne', value: sharedMetrics.expenses },
        {
          label: 'Marża operacyjna',
          value: (
            <span className="text-3xl font-bold text-white">{margin}%</span>
          ),
        },
      ],
      focusTitle: 'Company cockpit',
      focusDescription:
        'Pulpit skupia się na rentowności i kontroli kosztów, żeby szybciej ocenić kondycję firmy.',
      highlights: [
        { label: 'Cashflow', value: sharedMetrics.cashflow },
        { label: 'Największy koszt', value: sharedMetrics.largestExpense },
        { label: 'Budżet aktywny', value: sharedMetrics.budgetUsage },
      ],
    };
  }

  if (type === 'shared') {
    return {
      eyebrow: 'Shared',
      title: 'Pulpit współdzielonego budżetu',
      description:
        'Widok dla zespołu lub gospodarstwa domowego, z naciskiem na synchronizację i wspólną odpowiedzialność za wydatki.',
      metrics: [
        { label: 'Saldo wspólne', value: sharedMetrics.balance },
        { label: 'Wydatki miesiąca', value: sharedMetrics.expenses },
        {
          label: 'Liczba operacji',
          value: (
            <span className="text-3xl font-bold text-white">
              {params.transactionCount}
            </span>
          ),
        },
        { label: 'Budżet wykorzystany', value: sharedMetrics.budgetUsage },
      ],
      focusTitle: 'Pulpit współdzielony',
      focusDescription:
        'Dobrze sprawdza się tam, gdzie kilka osób wrzuca i synchronizuje wydatki do jednego workspaca.',
      highlights: [
        { label: 'Aktywne konta', value: <span>{params.accountCount}</span> },
        { label: 'Średni wydatek', value: sharedMetrics.averageExpense },
        { label: 'Pozostały budżet', value: sharedMetrics.budgetRemaining },
      ],
    };
  }

  return {
    eyebrow: 'Dom',
    title: 'Pulpit domowy',
    description:
      'Widok codziennych finansów z naciskiem na saldo, budżet miesięczny i największe koszty gospodarstwa.',
    metrics: [
      { label: 'Saldo domowe', value: sharedMetrics.balance },
      { label: 'Przychody miesiąca', value: sharedMetrics.income },
      { label: 'Wydatki miesiąca', value: sharedMetrics.expenses },
      { label: 'Wykorzystanie budżetu', value: sharedMetrics.budgetUsage },
    ],
    focusTitle: 'Dom i codzienne wydatki',
    focusDescription:
      'Ten pulpit pokazuje czy miesięczny rytm wydatków jest pod kontrolą i ile budżetu zostało do końca okresu.',
    highlights: [
      { label: 'Średni koszyk', value: sharedMetrics.averageExpense },
      { label: 'Największy wydatek', value: sharedMetrics.largestExpense },
      { label: 'Pozostały budżet', value: sharedMetrics.budgetRemaining },
    ],
  };
}
