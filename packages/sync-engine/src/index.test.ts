import { describe, expect, it } from 'vitest';

import { applyPullResult, buildIdleSyncState, countPendingOperations, getNextCursor } from './index';

describe('sync engine helpers', () => {
  it('counts only pending operations', () => {
    const count = countPendingOperations([
      {
        operationId: '1',
        deviceId: 'device',
        workspaceId: 'ws',
        entityType: 'transaction',
        entityId: 'txn',
        operationType: 'create',
        baseVersion: 0,
        payload: {},
        createdAt: '2026-03-10T10:00:00Z',
        retryCount: 0,
        status: 'pending',
      },
      {
        operationId: '2',
        deviceId: 'device',
        workspaceId: 'ws',
        entityType: 'transaction',
        entityId: 'txn-2',
        operationType: 'update',
        baseVersion: 1,
        payload: {},
        createdAt: '2026-03-10T10:00:00Z',
        retryCount: 0,
        status: 'applied',
      },
    ]);

    expect(count).toBe(1);
  });

  it('uses the highest cursor from a pull response', () => {
    expect(
      getNextCursor(12, {
        changes: [
          {
            changeId: 13,
            entityType: 'transaction',
            entityId: 'txn-1',
            operationType: 'create',
            version: 1,
            changedAt: '2026-03-10T10:00:00Z',
            payload: {},
          },
        ],
        nextCursor: 15,
        hasMore: false,
      }),
    ).toBe(15);
  });

  it('applies pull metadata to sync state', () => {
    const next = applyPullResult(
      buildIdleSyncState('ws-1'),
      {
        changes: [],
        nextCursor: 4,
        hasMore: false,
      },
    );

    expect(next.lastCursor).toBe(4);
    expect(next.status).toBe('success');
  });
});
