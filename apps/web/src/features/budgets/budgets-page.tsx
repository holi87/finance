import type {
  BudgetLimit,
  BudgetPeriod,
  Category,
  Transaction,
} from '@finance/shared-types';
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
import { useMemo, useState, type ReactNode } from 'react';

import { useWorkspace } from '../workspaces/workspace-context';
import {
  filterTransactionsInRange,
  findRelevantBudgetPeriod,
  getMonthRange,
  summarizeTransactions,
} from '../../services/finance-metrics';
import {
  createLocalBudgetLimit,
  createLocalBudgetPeriod,
  db,
  enqueueCreateOperation,
  refreshPendingCount,
} from '../../storage/db';
import { getDeviceId } from '../../services/session-store';

const EMPTY_BUDGET_PERIODS: BudgetPeriod[] = [];
const EMPTY_BUDGET_LIMITS: BudgetLimit[] = [];
const EMPTY_CATEGORIES: Category[] = [];
const EMPTY_TRANSACTIONS: Transaction[] = [];

export function BudgetsPage() {
  const { activeWorkspaceId, activeWorkspace } = useWorkspace();
  const currentMonthRange = useMemo(
    () => getMonthRange(new Date().toISOString().slice(0, 10)),
    [],
  );
  const [startsAt, setStartsAt] = useState(currentMonthRange.startsAt);
  const [endsAt, setEndsAt] = useState(currentMonthRange.endsAt);
  const [budgetPeriodId, setBudgetPeriodId] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [amount, setAmount] = useState('0.00');

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

  const currency = activeWorkspace?.baseCurrency ?? 'PLN';
  const today = new Date().toISOString().slice(0, 10);

  const visibleBudgetPeriods = useMemo(
    () =>
      budgetPeriods
        .slice()
        .sort((left, right) => right.startsAt.localeCompare(left.startsAt)),
    [budgetPeriods],
  );
  const visibleBudgetLimits = useMemo(
    () => budgetLimits.filter((limit) => !limit.deletedAt),
    [budgetLimits],
  );
  const visibleCategories = useMemo(
    () =>
      categories.filter(
        (category) => !category.deletedAt && !category.isArchived,
      ),
    [categories],
  );
  const budgetCategories = useMemo(
    () => visibleCategories.filter((category) => category.kind !== 'income'),
    [visibleCategories],
  );
  const visibleTransactions = useMemo(
    () => transactions.filter((transaction) => !transaction.deletedAt),
    [transactions],
  );

  const activeBudgetPeriod = findRelevantBudgetPeriod(
    visibleBudgetPeriods,
    today,
  );
  const resolvedBudgetPeriodId =
    budgetPeriodId ||
    activeBudgetPeriod?.id ||
    visibleBudgetPeriods[0]?.id ||
    '';
  const resolvedCategoryId = categoryId || budgetCategories[0]?.id || '';
  const selectedBudgetPeriod =
    visibleBudgetPeriods.find(
      (period) => period.id === resolvedBudgetPeriodId,
    ) ?? activeBudgetPeriod;
  const periodTransactions = selectedBudgetPeriod
    ? filterTransactionsInRange(
        visibleTransactions,
        selectedBudgetPeriod.startsAt,
        selectedBudgetPeriod.endsAt,
      )
    : EMPTY_TRANSACTIONS;
  const periodSummary = summarizeTransactions(periodTransactions);

  const limitsWithUsage = useMemo(
    () =>
      visibleBudgetLimits
        .map((limit) => {
          const period = visibleBudgetPeriods.find(
            (entry) => entry.id === limit.budgetPeriodId,
          );
          const category = visibleCategories.find(
            (entry) => entry.id === limit.categoryId,
          );

          if (!period || !category) {
            return null;
          }

          const spent = filterTransactionsInRange(
            visibleTransactions,
            period.startsAt,
            period.endsAt,
          )
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
            period,
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
            period: BudgetPeriod;
            category: Category;
            spent: number;
            remaining: number;
            progress: number;
          } => entry !== null,
        )
        .sort((left, right) =>
          right.period.startsAt.localeCompare(left.period.startsAt),
        ),
    [
      visibleBudgetLimits,
      visibleBudgetPeriods,
      visibleCategories,
      visibleTransactions,
    ],
  );

  const periodLimits = limitsWithUsage.filter(
    (entry) => entry.period.id === resolvedBudgetPeriodId,
  );
  const plannedTotal = periodLimits.reduce(
    (sum, entry) => sum + Number(entry.limit.amount),
    0,
  );
  const spentTotal = periodLimits.reduce((sum, entry) => sum + entry.spent, 0);
  const remainingTotal = plannedTotal - spentTotal;

  return (
    <div className="space-y-6">
      <SectionHeader
        eyebrow="Planning"
        title="Budżety"
        description="Transakcje od razu obciążają budżet okresu i pokazują, ile zostało do wydania."
        action={
          selectedBudgetPeriod ? (
            <SyncBadge
              label={`${selectedBudgetPeriod.startsAt} → ${selectedBudgetPeriod.endsAt}`}
              tone="neutral"
            />
          ) : null
        }
      />

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <BudgetSummaryCard
          label="Zaplanowano"
          value={
            <CurrencyAmount value={String(plannedTotal)} currency={currency} />
          }
          note="Suma limitów w wybranym okresie"
        />
        <BudgetSummaryCard
          label="Wydano"
          value={
            <CurrencyAmount value={String(spentTotal)} currency={currency} />
          }
          note="Wydatki z przypiętych kategorii"
        />
        <BudgetSummaryCard
          label={remainingTotal >= 0 ? 'Pozostało' : 'Przekroczenie'}
          value={
            <CurrencyAmount
              value={String(Math.abs(remainingTotal))}
              currency={currency}
            />
          }
          note={
            remainingTotal >= 0
              ? 'Środki jeszcze dostępne'
              : 'Budżet został przekroczony'
          }
        />
        <BudgetSummaryCard
          label={periodSummary.net >= 0 ? 'Bilans okresu +' : 'Bilans okresu -'}
          value={
            <CurrencyAmount
              value={String(Math.abs(periodSummary.net))}
              currency={currency}
            />
          }
          note="Przychody minus wydatki w całym okresie"
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <section className="rounded-[28px] border border-white/10 bg-stone-950/70 p-5">
          <h3 className="font-display text-xl font-semibold text-white">
            Nowy okres budżetowy
          </h3>
          <form
            className="mt-4 grid gap-4 md:grid-cols-3"
            onSubmit={(event) => {
              event.preventDefault();
              if (!activeWorkspaceId) {
                return;
              }

              const period = createLocalBudgetPeriod(activeWorkspaceId, {
                startsAt,
                endsAt,
              });
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
            <Input
              label="Start"
              name="startsAt"
              type="date"
              value={startsAt}
              onChange={setStartsAt}
            />
            <Input
              label="Koniec"
              name="endsAt"
              type="date"
              value={endsAt}
              onChange={setEndsAt}
            />
            <div className="flex items-end">
              <Button type="submit" className="w-full">
                Dodaj okres
              </Button>
            </div>
          </form>
        </section>

        <section className="rounded-[28px] border border-white/10 bg-stone-950/70 p-5">
          <h3 className="font-display text-xl font-semibold text-white">
            Nowy limit
          </h3>
          <form
            className="mt-4 grid gap-4 md:grid-cols-2"
            onSubmit={(event) => {
              event.preventDefault();
              if (
                !activeWorkspaceId ||
                !resolvedBudgetPeriodId ||
                !resolvedCategoryId
              ) {
                return;
              }

              const limit = createLocalBudgetLimit(activeWorkspaceId, {
                budgetPeriodId: resolvedBudgetPeriodId,
                categoryId: resolvedCategoryId,
                amount,
                currency,
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
                      budgetPeriodId: resolvedBudgetPeriodId,
                      categoryId: resolvedCategoryId,
                      amount,
                      currency,
                    },
                  }),
                )
                .then(() => refreshPendingCount(activeWorkspaceId));
            }}
          >
            <Select
              label="Okres"
              name="budgetPeriodId"
              value={resolvedBudgetPeriodId}
              onChange={setBudgetPeriodId}
              options={visibleBudgetPeriods.map((period) => ({
                label: `${period.startsAt} → ${period.endsAt}`,
                value: period.id,
              }))}
            />
            <Select
              label="Kategoria"
              name="categoryId"
              value={resolvedCategoryId}
              onChange={setCategoryId}
              options={budgetCategories.map((category) => ({
                label: category.name,
                value: category.id,
              }))}
            />
            <Input
              label="Kwota"
              name="amount"
              value={amount}
              onChange={setAmount}
            />
            <div className="flex items-end">
              <Button
                type="submit"
                className="w-full"
                disabled={!resolvedBudgetPeriodId || !resolvedCategoryId}
              >
                Dodaj limit
              </Button>
            </div>
          </form>
        </section>
      </div>

      {periodLimits.length === 0 ? (
        <EmptyState
          title="Brak limitów w wybranym okresie"
          description="Dodaj okres i limity kategorii, aby transakcje od razu zaczęły konsumować budżet."
        />
      ) : (
        <div className="grid gap-4 xl:grid-cols-2">
          {periodLimits.map(
            ({ limit, period, category, progress, remaining, spent }) => (
              <article
                key={limit.id}
                className="rounded-[28px] border border-white/10 bg-stone-950/70 p-5"
              >
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="font-semibold text-white">{category.name}</p>
                    <p className="text-sm text-stone-400">
                      {period.startsAt} → {period.endsAt}
                    </p>
                  </div>
                  <span className="rounded-full bg-white/10 px-3 py-1 text-xs font-semibold text-stone-300">
                    {progress}%
                  </span>
                </div>

                <div className="mt-4 grid gap-3 md:grid-cols-3">
                  <BudgetValue
                    label="Wydano"
                    value={
                      <CurrencyAmount
                        value={String(spent)}
                        currency={limit.currency}
                      />
                    }
                  />
                  <BudgetValue
                    label="Limit"
                    value={
                      <CurrencyAmount
                        value={limit.amount}
                        currency={limit.currency}
                      />
                    }
                  />
                  <BudgetValue
                    label={remaining >= 0 ? 'Zostało' : 'Ponad limit'}
                    value={
                      <CurrencyAmount
                        value={String(Math.abs(remaining))}
                        currency={limit.currency}
                      />
                    }
                  />
                </div>

                <div className="mt-4 h-2 rounded-full bg-white/10">
                  <div
                    className={`h-2 rounded-full ${
                      progress > 100
                        ? 'bg-rose-300'
                        : progress > 80
                          ? 'bg-amber-300'
                          : 'bg-lime-300'
                    }`}
                    style={{ width: `${Math.min(progress, 100)}%` }}
                  />
                </div>
              </article>
            ),
          )}
        </div>
      )}
    </div>
  );
}

function BudgetSummaryCard({
  label,
  value,
  note,
}: {
  label: string;
  value: ReactNode;
  note: string;
}) {
  return (
    <article className="rounded-[28px] border border-white/10 bg-stone-950/70 p-5 shadow-halo">
      <p className="text-sm text-stone-400">{label}</p>
      <div className="mt-4 text-3xl font-bold text-white">{value}</div>
      <p className="mt-3 text-sm text-stone-500">{note}</p>
    </article>
  );
}

function BudgetValue({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="rounded-[22px] border border-white/10 bg-white/5 px-4 py-3">
      <p className="text-xs uppercase tracking-[0.2em] text-stone-500">
        {label}
      </p>
      <div className="mt-2 font-semibold text-white">{value}</div>
    </div>
  );
}
