import type {
  Account,
  BudgetLimit,
  Category,
  Transaction,
  WorkspaceType,
} from '@finance/shared-types';
import type { ReactNode } from 'react';

import { CurrencyAmount, EmptyState, SectionHeader } from '@finance/ui';
import { useLiveQuery } from 'dexie-react-hooks';
import { useMemo } from 'react';

import { useWorkspace } from '../workspaces/workspace-context';
import { db } from '../../storage/db';

const EMPTY_ACCOUNTS: Account[] = [];
const EMPTY_TRANSACTIONS: Transaction[] = [];
const EMPTY_BUDGET_LIMITS: BudgetLimit[] = [];
const EMPTY_CATEGORIES: Category[] = [];

export function DashboardPage() {
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
              .reverse()
              .sortBy('transactionDate')
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

  const currency = activeWorkspace.baseCurrency;
  const monthPrefix = new Date().toISOString().slice(0, 7);
  const monthTransactions = visibleTransactions.filter((transaction) =>
    transaction.transactionDate.startsWith(monthPrefix),
  );
  const income = monthTransactions
    .filter((transaction) => transaction.type === 'income')
    .reduce((sum, transaction) => sum + Number(transaction.amount), 0);
  const expenses = monthTransactions
    .filter((transaction) => transaction.type === 'expense')
    .reduce((sum, transaction) => sum + Number(transaction.amount), 0);
  const totalBalance = visibleAccounts.reduce(
    (sum, account) => sum + Number(account.currentBalanceCached),
    0,
  );
  const cashflow = income - expenses;
  const budgetTotal = visibleBudgetLimits.reduce(
    (sum, limit) => sum + Number(limit.amount),
    0,
  );
  const budgetUsage =
    budgetTotal > 0 ? Math.round((expenses / budgetTotal) * 100) : 0;
  const averageExpense =
    expenses > 0
      ? expenses /
        Math.max(
          1,
          monthTransactions.filter(
            (transaction) => transaction.type === 'expense',
          ).length,
        )
      : 0;
  const largestExpense =
    monthTransactions
      .filter((transaction) => transaction.type === 'expense')
      .reduce<Transaction | null>((largest, transaction) => {
        if (!largest || Number(transaction.amount) > Number(largest.amount)) {
          return transaction;
        }

        return largest;
      }, null) ?? null;
  const monthlyCategorySpend = visibleCategories
    .map((category) => {
      const spent = monthTransactions
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

  const lens = buildWorkspaceLens(activeWorkspace.type, {
    currency,
    totalBalance,
    income,
    expenses,
    cashflow,
    budgetUsage,
    budgetRemaining: budgetTotal - expenses,
    averageExpense,
    largestExpenseAmount: largestExpense ? Number(largestExpense.amount) : 0,
    transactionCount: monthTransactions.length,
    accountCount: visibleAccounts.length,
  });

  return (
    <div className="space-y-6">
      <SectionHeader
        eyebrow={lens.eyebrow}
        title={lens.title}
        description={lens.description}
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

      <div className="grid gap-4 xl:grid-cols-[0.95fr_1.05fr]">
        <section className="rounded-[28px] border border-white/10 bg-stone-950/70 p-5">
          <SectionHeader
            eyebrow="Lens"
            title={lens.focusTitle}
            description={lens.focusDescription}
          />

          <div className="mt-5 grid gap-3 md:grid-cols-3">
            {lens.highlights.map((highlight) => (
              <div
                key={highlight.label}
                className="rounded-[22px] border border-white/10 bg-white/5 px-4 py-4"
              >
                <p className="text-xs uppercase tracking-[0.2em] text-stone-500">
                  {highlight.label}
                </p>
                <div className="mt-3 font-display text-2xl font-bold text-white">
                  {highlight.value}
                </div>
              </div>
            ))}
          </div>

          <div className="mt-6 space-y-3">
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
        </section>

        <section className="rounded-[28px] border border-white/10 bg-stone-950/70 p-5">
          <SectionHeader
            eyebrow="Recent"
            title="Ostatnie transakcje"
            description="Szybki podgląd ostatnich zapisów z lokalnego snapshotu aktywnego workspace’u."
          />

          <div className="mt-5 space-y-3">
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
                .slice(0, 6)
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
          description="Widok gotówki i kont roboczych dla aktualnego kontekstu operacyjnego."
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
        value={String(Math.max(params.budgetRemaining, 0))}
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
        'Widok zarządczy pod przychód, koszty i marżę operacyjną w kontekście firmowym.',
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
