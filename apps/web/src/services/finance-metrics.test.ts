import { describe, expect, it } from 'vitest';

import {
  buildCashflowSeries,
  findRelevantBudgetPeriod,
  summarizeTransactions,
} from './finance-metrics';

describe('finance metrics', () => {
  it('picks current budget period when one covers today', () => {
    const period = findRelevantBudgetPeriod(
      [
        {
          id: 'old',
          workspaceId: 'ws-1',
          periodType: 'monthly',
          startsAt: '2026-02-01',
          endsAt: '2026-02-28',
          createdAt: '2026-02-01T00:00:00.000Z',
          updatedAt: '2026-02-01T00:00:00.000Z',
        },
        {
          id: 'current',
          workspaceId: 'ws-1',
          periodType: 'monthly',
          startsAt: '2026-03-01',
          endsAt: '2026-03-31',
          createdAt: '2026-03-01T00:00:00.000Z',
          updatedAt: '2026-03-01T00:00:00.000Z',
        },
      ],
      '2026-03-10',
    );

    expect(period?.id).toBe('current');
  });

  it('builds weekly cashflow buckets with income and expense totals', () => {
    const series = buildCashflowSeries(
      [
        {
          id: 'tx-1',
          workspaceId: 'ws-1',
          accountId: 'acc-1',
          categoryId: 'cat-1',
          type: 'expense',
          amount: '50.00',
          currency: 'PLN',
          description: null,
          notes: null,
          transactionDate: '2026-03-10',
          createdBy: 'user-1',
          version: 1,
          createdAt: '2026-03-10T00:00:00.000Z',
          updatedAt: '2026-03-10T00:00:00.000Z',
          deletedAt: null,
        },
        {
          id: 'tx-2',
          workspaceId: 'ws-1',
          accountId: 'acc-1',
          categoryId: null,
          type: 'income',
          amount: '120.00',
          currency: 'PLN',
          description: null,
          notes: null,
          transactionDate: '2026-03-12',
          createdBy: 'user-1',
          version: 1,
          createdAt: '2026-03-12T00:00:00.000Z',
          updatedAt: '2026-03-12T00:00:00.000Z',
          deletedAt: null,
        },
      ],
      'week',
      1,
      '2026-03-12',
    );

    expect(series).toHaveLength(1);
    expect(series[0]?.income).toBe(120);
    expect(series[0]?.expenses).toBe(50);
    expect(series[0]?.net).toBe(70);
  });

  it('summarizes transactions into income expenses and net', () => {
    const summary = summarizeTransactions([
      {
        id: 'tx-1',
        workspaceId: 'ws-1',
        accountId: 'acc-1',
        categoryId: 'cat-1',
        type: 'expense',
        amount: '40.00',
        currency: 'PLN',
        description: null,
        notes: null,
        transactionDate: '2026-03-10',
        createdBy: 'user-1',
        version: 1,
        createdAt: '2026-03-10T00:00:00.000Z',
        updatedAt: '2026-03-10T00:00:00.000Z',
        deletedAt: null,
      },
      {
        id: 'tx-2',
        workspaceId: 'ws-1',
        accountId: 'acc-1',
        categoryId: null,
        type: 'income',
        amount: '100.00',
        currency: 'PLN',
        description: null,
        notes: null,
        transactionDate: '2026-03-11',
        createdBy: 'user-1',
        version: 1,
        createdAt: '2026-03-11T00:00:00.000Z',
        updatedAt: '2026-03-11T00:00:00.000Z',
        deletedAt: null,
      },
    ]);

    expect(summary).toEqual({
      income: 100,
      expenses: 40,
      net: 60,
    });
  });
});
