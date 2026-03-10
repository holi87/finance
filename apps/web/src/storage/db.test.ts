import { describe, expect, it } from 'vitest';

import {
  applyLocalTransactionToAccount,
  createLocalAccount,
  createLocalTransaction,
} from './db';

describe('local db helpers', () => {
  it('creates a local account with version 0', () => {
    const account = createLocalAccount('ws-1', {
      name: 'Konto główne',
      type: 'bank',
      currency: 'PLN',
      openingBalance: '100.00',
    });

    expect(account.workspaceId).toBe('ws-1');
    expect(account.version).toBe(0);
  });

  it('creates a local transaction snapshot for outbox flow', () => {
    const transaction = createLocalTransaction('ws-1', 'user-1', {
      accountId: 'acc-1',
      categoryId: 'cat-1',
      type: 'expense',
      amount: '25.50',
      currency: 'PLN',
      transactionDate: '2026-03-10',
    });

    expect(transaction.workspaceId).toBe('ws-1');
    expect(transaction.createdBy).toBe('user-1');
    expect(transaction.version).toBe(0);
  });

  it('updates local account balance after expense transaction', () => {
    const account = createLocalAccount('ws-1', {
      name: 'Konto główne',
      type: 'bank',
      currency: 'PLN',
      openingBalance: '100.00',
    });

    const nextAccount = applyLocalTransactionToAccount(account, {
      type: 'expense',
      amount: '25.50',
    });

    expect(nextAccount.currentBalanceCached).toBe('74.50');
  });
});
