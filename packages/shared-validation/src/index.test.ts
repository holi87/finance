import { describe, expect, it } from 'vitest';

import { createTransactionSchema, loginSchema, pushSchema } from './index';

describe('shared validation', () => {
  it('accepts valid login payload', () => {
    const parsed = loginSchema.parse({
      email: 'user@example.com',
      password: 'supersecret',
    });

    expect(parsed.email).toBe('user@example.com');
  });

  it('rejects invalid money values', () => {
    expect(() =>
      createTransactionSchema.parse({
        accountId: 'acc-1',
        type: 'expense',
        amount: '12.999',
        currency: 'PLN',
        transactionDate: '2026-03-10',
      }),
    ).toThrow();
  });

  it('requires sync operation metadata', () => {
    expect(() =>
      pushSchema.parse({
        deviceId: 'dev-1',
        workspaceId: 'ws-1',
        operations: [{ operationId: '1' }],
      }),
    ).toThrow();
  });
});
