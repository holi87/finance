import type { BudgetPeriod, Transaction } from '@finance/shared-types';

export type TrendGranularity = 'day' | 'week' | 'month';

export interface CashflowBucket {
  key: string;
  label: string;
  rangeLabel: string;
  startsAt: string;
  endsAt: string;
  income: number;
  expenses: number;
  net: number;
}

const dayFormatter = new Intl.DateTimeFormat('pl-PL', {
  day: '2-digit',
  month: '2-digit',
});
const monthFormatter = new Intl.DateTimeFormat('pl-PL', {
  month: 'short',
});

function parseIsoDate(value: string) {
  return new Date(`${value}T12:00:00`);
}

function toIsoDate(value: Date) {
  return value.toISOString().slice(0, 10);
}

function addDays(value: Date, amount: number) {
  const next = new Date(value);
  next.setDate(next.getDate() + amount);
  return next;
}

function startOfWeek(value: Date) {
  const next = new Date(value);
  const day = next.getDay();
  const offset = day === 0 ? -6 : 1 - day;
  next.setDate(next.getDate() + offset);
  next.setHours(12, 0, 0, 0);
  return next;
}

function startOfMonth(value: Date) {
  return new Date(value.getFullYear(), value.getMonth(), 1, 12, 0, 0, 0);
}

function addMonths(value: Date, amount: number) {
  return new Date(value.getFullYear(), value.getMonth() + amount, 1, 12, 0, 0);
}

function endOfMonth(value: Date) {
  return new Date(value.getFullYear(), value.getMonth() + 1, 0, 12, 0, 0, 0);
}

function formatWeekLabel(startsAt: string, endsAt: string) {
  return `${dayFormatter.format(parseIsoDate(startsAt))} - ${dayFormatter.format(parseIsoDate(endsAt))}`;
}

function buildBucketRange(
  granularity: TrendGranularity,
  referenceDate: string,
  index: number,
  total: number,
) {
  const baseDate = parseIsoDate(referenceDate);
  const offset = index - (total - 1);

  if (granularity === 'day') {
    const current = addDays(baseDate, offset);
    const isoDate = toIsoDate(current);
    return {
      key: isoDate,
      label: dayFormatter.format(current),
      rangeLabel: isoDate,
      startsAt: isoDate,
      endsAt: isoDate,
    };
  }

  if (granularity === 'week') {
    const currentWeekStart = startOfWeek(baseDate);
    const startsAt = toIsoDate(addDays(currentWeekStart, offset * 7));
    const endsAt = toIsoDate(addDays(parseIsoDate(startsAt), 6));
    return {
      key: startsAt,
      label: dayFormatter.format(parseIsoDate(startsAt)),
      rangeLabel: formatWeekLabel(startsAt, endsAt),
      startsAt,
      endsAt,
    };
  }

  const currentMonthStart = startOfMonth(baseDate);
  const monthStart = addMonths(currentMonthStart, offset);
  const startsAt = toIsoDate(monthStart);
  const endsAt = toIsoDate(endOfMonth(monthStart));

  return {
    key: startsAt,
    label: monthFormatter.format(monthStart).replace('.', ''),
    rangeLabel: `${monthFormatter.format(monthStart)} ${monthStart.getFullYear()}`,
    startsAt,
    endsAt,
  };
}

export function isDateInRange(date: string, startsAt: string, endsAt: string) {
  return date >= startsAt && date <= endsAt;
}

export function getMonthRange(referenceDate: string, monthOffset = 0) {
  const monthStart = addMonths(
    startOfMonth(parseIsoDate(referenceDate)),
    monthOffset,
  );
  return {
    startsAt: toIsoDate(monthStart),
    endsAt: toIsoDate(endOfMonth(monthStart)),
  };
}

export function filterTransactionsInRange(
  transactions: Transaction[],
  startsAt: string,
  endsAt: string,
) {
  return transactions.filter((transaction) =>
    isDateInRange(transaction.transactionDate, startsAt, endsAt),
  );
}

export function summarizeTransactions(transactions: Transaction[]) {
  const income = transactions
    .filter((transaction) => transaction.type === 'income')
    .reduce((sum, transaction) => sum + Number(transaction.amount), 0);
  const expenses = transactions
    .filter((transaction) => transaction.type === 'expense')
    .reduce((sum, transaction) => sum + Number(transaction.amount), 0);

  return {
    income,
    expenses,
    net: income - expenses,
  };
}

export function findRelevantBudgetPeriod(
  periods: BudgetPeriod[],
  referenceDate: string,
) {
  const current = periods
    .filter((period) =>
      isDateInRange(referenceDate, period.startsAt, period.endsAt),
    )
    .sort((left, right) => right.startsAt.localeCompare(left.startsAt))[0];

  if (current) {
    return current;
  }

  return (
    periods
      .slice()
      .sort((left, right) => right.startsAt.localeCompare(left.startsAt))[0] ??
    null
  );
}

export function buildCashflowSeries(
  transactions: Transaction[],
  granularity: TrendGranularity,
  bucketCount: number,
  referenceDate: string,
) {
  return Array.from({ length: bucketCount }, (_, index) => {
    const range = buildBucketRange(
      granularity,
      referenceDate,
      index,
      bucketCount,
    );
    const summary = summarizeTransactions(
      filterTransactionsInRange(transactions, range.startsAt, range.endsAt),
    );

    return {
      ...range,
      income: summary.income,
      expenses: summary.expenses,
      net: summary.net,
    } satisfies CashflowBucket;
  });
}
