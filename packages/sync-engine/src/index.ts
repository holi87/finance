import type {
  PullResponse,
  SyncChange,
  SyncOperation,
  SyncOperationStatus,
  SyncState,
} from '@finance/shared-types';

export function createPendingOperation<TPayload>(
  input: Omit<SyncOperation<TPayload>, 'createdAt' | 'retryCount' | 'status'>,
): SyncOperation<TPayload> {
  return {
    ...input,
    createdAt: new Date().toISOString(),
    retryCount: 0,
    status: 'pending',
  };
}

export function markOperationStatus<TPayload>(
  operation: SyncOperation<TPayload>,
  status: SyncOperationStatus,
  errorMessage?: string,
): SyncOperation<TPayload> {
  return {
    ...operation,
    status,
    retryCount: status === 'failed' ? operation.retryCount + 1 : operation.retryCount,
    errorMessage,
  };
}

export function getNextCursor(currentCursor: number, pullResponse: PullResponse): number {
  const highestChangeId = pullResponse.changes.reduce((max, change) => {
    return change.changeId > max ? change.changeId : max;
  }, currentCursor);

  return pullResponse.nextCursor > highestChangeId ? pullResponse.nextCursor : highestChangeId;
}

export function countPendingOperations<TPayload>(operations: Array<SyncOperation<TPayload>>): number {
  return operations.filter((operation) => operation.status === 'pending').length;
}

export function sortChanges(changes: SyncChange[]): SyncChange[] {
  return [...changes].sort((left, right) => left.changeId - right.changeId);
}

export function buildIdleSyncState(workspaceId: string): SyncState {
  return {
    workspaceId,
    pendingOperations: 0,
    lastSyncedAt: null,
    lastCursor: 0,
    status: 'idle',
    errorMessage: null,
  };
}

export function applyPullResult(previous: SyncState, response: PullResponse): SyncState {
  return {
    ...previous,
    lastCursor: getNextCursor(previous.lastCursor, response),
    lastSyncedAt: new Date().toISOString(),
    status: 'success',
    errorMessage: null,
  };
}
