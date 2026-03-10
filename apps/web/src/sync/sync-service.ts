import type {
  Account,
  BudgetLimit,
  BudgetPeriod,
  Category,
  PullResponse,
  PushResponse,
  Transaction,
} from '@finance/shared-types';
import { applyPullResult, countPendingOperations, sortChanges } from '@finance/sync-engine';

import { getDeviceId } from '../services/session-store';
import {
  applyRemoteChange,
  ensureSyncState,
  getSyncState,
  listPendingOperations,
  markOperationsApplied,
  markOperationsRejected,
  recalculateWorkspaceAccountBalances,
  replaceWorkspaceSnapshot,
  setSyncState,
  workspaceHasSnapshot,
} from '../storage/db';

export async function hydrateWorkspace(
  request: <T>(path: string, init?: RequestInit) => Promise<T>,
  workspaceId: string,
) {
  const [accounts, categories, transactions, budgetPeriods, budgetLimits] = await Promise.all([
    request<Account[]>(`workspaces/${workspaceId}/accounts`),
    request<Category[]>(`workspaces/${workspaceId}/categories`),
    request<{ items: Transaction[] }>(`workspaces/${workspaceId}/transactions?page=1&pageSize=100`),
    request<BudgetPeriod[]>(`workspaces/${workspaceId}/budget-periods`),
    request<BudgetLimit[]>(`workspaces/${workspaceId}/budget-limits`),
  ]);

  await replaceWorkspaceSnapshot({
    workspaceId,
    accounts,
    categories,
    transactions: transactions.items,
    budgetPeriods,
    budgetLimits,
  });
  await ensureSyncState(workspaceId);
}

export async function syncWorkspace(
  request: <T>(path: string, init?: RequestInit) => Promise<T>,
  workspaceId: string,
) {
  const deviceId = getDeviceId();
  const pendingOperations = await listPendingOperations(workspaceId);
  const currentState = await getSyncState(workspaceId);

  await setSyncState(workspaceId, {
    status: navigator.onLine ? 'syncing' : 'offline',
    pendingOperations: countPendingOperations(pendingOperations),
    errorMessage: null,
  });

  if (!navigator.onLine) {
    return getSyncState(workspaceId);
  }

  if (pendingOperations.length > 0) {
    const pushResponse = await request<PushResponse>('sync/push', {
      method: 'POST',
      body: JSON.stringify({
        deviceId,
        workspaceId,
        operations: pendingOperations.map((operation) => ({
          operationId: operation.operationId,
          entityType: operation.entityType,
          entityId: operation.entityId,
          operationType: operation.operationType,
          baseVersion: operation.baseVersion,
          payload: operation.payload,
        })),
      }),
    });

    await markOperationsApplied(workspaceId, pushResponse.accepted);
    await markOperationsRejected(workspaceId, pushResponse.rejected);

    if (pushResponse.rejected.length > 0) {
      await setSyncState(workspaceId, {
        status: 'error',
        errorMessage: pushResponse.rejected[0]?.message ?? 'Sync rejected an operation',
      });
    }
  }

  const pullResponse = await request<PullResponse>(
    `sync/pull?workspaceId=${workspaceId}&cursor=${currentState.lastCursor}&limit=200&deviceId=${deviceId}`,
  );

  for (const change of sortChanges(pullResponse.changes)) {
    await applyRemoteChange(change as never);
  }

  await recalculateWorkspaceAccountBalances(workspaceId);

  const nextState = applyPullResult(await getSyncState(workspaceId), pullResponse);
  const remaining = await listPendingOperations(workspaceId);
  await setSyncState(workspaceId, {
    ...nextState,
    pendingOperations: remaining.length,
  });

  return getSyncState(workspaceId);
}

export async function ensureWorkspaceHydrated(
  request: <T>(path: string, init?: RequestInit) => Promise<T>,
  workspaceId: string,
) {
  const hasSnapshot = await workspaceHasSnapshot(workspaceId);
  if (!hasSnapshot) {
    await hydrateWorkspace(request, workspaceId);
  }
}
