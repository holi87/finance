import type {
  Account,
  BudgetLimit,
  BudgetPeriod,
  Category,
  SyncOperation,
  SyncState,
  Transaction,
  WorkspaceSummary,
} from '@finance/shared-types';
import {
  buildIdleSyncState,
  createPendingOperation,
} from '@finance/sync-engine';
import Dexie, { type Table } from 'dexie';

export class BudgetTrackerDB extends Dexie {
  workspaces!: Table<WorkspaceSummary, string>;
  accounts!: Table<Account, string>;
  categories!: Table<Category, string>;
  transactions!: Table<Transaction, string>;
  budgetPeriods!: Table<BudgetPeriod, string>;
  budgetLimits!: Table<BudgetLimit, string>;
  outbox!: Table<SyncOperation, string>;
  syncStates!: Table<SyncState, string>;

  constructor() {
    super('budget-tracker-db');
    this.version(1).stores({
      workspaces: '&id, name, type',
      accounts: '&id, workspaceId, updatedAt',
      categories: '&id, workspaceId, updatedAt',
      transactions: '&id, workspaceId, transactionDate, updatedAt',
      budgetPeriods: '&id, workspaceId, startsAt',
      budgetLimits: '&id, workspaceId, budgetPeriodId, updatedAt',
      outbox: '&operationId, workspaceId, status, createdAt',
      syncStates: '&workspaceId, status, lastSyncedAt',
    });
  }
}

export const db = new BudgetTrackerDB();

export async function clearLocalData() {
  await db.transaction(
    'rw',
    [
      db.workspaces,
      db.accounts,
      db.categories,
      db.transactions,
      db.budgetPeriods,
      db.budgetLimits,
      db.outbox,
      db.syncStates,
    ],
    async () => {
      await Promise.all([
        db.workspaces.clear(),
        db.accounts.clear(),
        db.categories.clear(),
        db.transactions.clear(),
        db.budgetPeriods.clear(),
        db.budgetLimits.clear(),
        db.outbox.clear(),
        db.syncStates.clear(),
      ]);
    },
  );
}

export async function replaceWorkspaces(workspaces: WorkspaceSummary[]) {
  await db.transaction('rw', db.workspaces, async () => {
    await db.workspaces.clear();
    await db.workspaces.bulkPut(workspaces);
  });
  for (const workspace of workspaces) {
    await ensureSyncState(workspace.id);
  }
}

export async function replaceWorkspaceSnapshot(input: {
  workspaceId: string;
  accounts: Account[];
  categories: Category[];
  transactions: Transaction[];
  budgetPeriods: BudgetPeriod[];
  budgetLimits: BudgetLimit[];
}) {
  await db.transaction(
    'rw',
    [
      db.accounts,
      db.categories,
      db.transactions,
      db.budgetPeriods,
      db.budgetLimits,
    ],
    async () => {
      await Promise.all([
        db.accounts.where('workspaceId').equals(input.workspaceId).delete(),
        db.categories.where('workspaceId').equals(input.workspaceId).delete(),
        db.transactions.where('workspaceId').equals(input.workspaceId).delete(),
        db.budgetPeriods
          .where('workspaceId')
          .equals(input.workspaceId)
          .delete(),
        db.budgetLimits.where('workspaceId').equals(input.workspaceId).delete(),
      ]);

      await Promise.all([
        db.accounts.bulkPut(input.accounts),
        db.categories.bulkPut(input.categories),
        db.transactions.bulkPut(input.transactions),
        db.budgetPeriods.bulkPut(input.budgetPeriods),
        db.budgetLimits.bulkPut(input.budgetLimits),
      ]);
    },
  );
}

export async function workspaceHasSnapshot(workspaceId: string) {
  const [accountsCount, categoriesCount, transactionsCount] = await Promise.all(
    [
      db.accounts.where('workspaceId').equals(workspaceId).count(),
      db.categories.where('workspaceId').equals(workspaceId).count(),
      db.transactions.where('workspaceId').equals(workspaceId).count(),
    ],
  );

  return accountsCount + categoriesCount + transactionsCount > 0;
}

export async function ensureSyncState(workspaceId: string) {
  const existing = await db.syncStates.get(workspaceId);
  if (!existing) {
    await db.syncStates.put(buildIdleSyncState(workspaceId));
  }
}

export async function setSyncState(
  workspaceId: string,
  patch: Partial<SyncState>,
) {
  const current =
    (await db.syncStates.get(workspaceId)) ?? buildIdleSyncState(workspaceId);
  const next = { ...current, ...patch };
  await db.syncStates.put(next);
  return next;
}

export async function getSyncState(workspaceId: string) {
  return (
    (await db.syncStates.get(workspaceId)) ?? buildIdleSyncState(workspaceId)
  );
}

export async function enqueueOperation<
  TPayload extends Record<string, unknown>,
>(params: {
  deviceId: string;
  workspaceId: string;
  entityType: SyncOperation['entityType'];
  entityId: string;
  operationType: SyncOperation['operationType'];
  baseVersion: number;
  payload: TPayload;
}) {
  const operation = createPendingOperation({
    operationId: crypto.randomUUID(),
    deviceId: params.deviceId,
    workspaceId: params.workspaceId,
    entityType: params.entityType,
    entityId: params.entityId,
    operationType: params.operationType,
    baseVersion: params.baseVersion,
    payload: params.payload,
  });
  await db.outbox.put(operation);
  return operation;
}

export async function enqueueCreateOperation<
  TPayload extends Record<string, unknown>,
>(params: {
  deviceId: string;
  workspaceId: string;
  entityType: SyncOperation['entityType'];
  entityId: string;
  payload: TPayload;
}) {
  return enqueueOperation({
    ...params,
    operationType: 'create',
    baseVersion: 0,
  });
}

export async function listPendingOperations(workspaceId: string) {
  return db.outbox
    .where('workspaceId')
    .equals(workspaceId)
    .filter(
      (operation) =>
        operation.status === 'pending' || operation.status === 'failed',
    )
    .sortBy('createdAt');
}

export async function refreshPendingCount(workspaceId: string) {
  const pending = await listPendingOperations(workspaceId);
  await setSyncState(workspaceId, { pendingOperations: pending.length });
  return pending.length;
}

export async function markOperationsApplied(
  workspaceId: string,
  acceptedOperations: Array<{
    operationId: string;
    entityType: SyncOperation['entityType'];
    entityId: string;
    newVersion: number;
  }>,
) {
  await db.transaction(
    'rw',
    [db.outbox, db.accounts, db.categories, db.transactions, db.budgetLimits],
    async () => {
      for (const accepted of acceptedOperations) {
        await db.outbox.delete(accepted.operationId);
        await applyAcceptedVersion(
          accepted.entityType,
          accepted.entityId,
          accepted.newVersion,
        );
      }
    },
  );

  await refreshPendingCount(workspaceId);
}

export async function markOperationsRejected(
  workspaceId: string,
  rejectedOperations: Array<{
    operationId: string;
    status: SyncOperation['status'];
    message: string;
  }>,
) {
  for (const rejected of rejectedOperations) {
    const operation = await db.outbox.get(rejected.operationId);
    if (operation) {
      await db.outbox.put({
        ...operation,
        status: rejected.status,
        errorMessage: rejected.message,
        retryCount: operation.retryCount + 1,
      });
    }
  }

  await refreshPendingCount(workspaceId);
}

export async function applyRemoteChange(change: {
  entityType: SyncOperation['entityType'];
  payload: Record<string, unknown>;
}) {
  switch (change.entityType) {
    case 'account':
      await db.accounts.put(normalizeAccount(change.payload));
      break;
    case 'category':
      await db.categories.put(normalizeCategory(change.payload));
      break;
    case 'transaction':
      await db.transactions.put(normalizeTransaction(change.payload));
      break;
    case 'budgetLimit':
      await db.budgetLimits.put(normalizeBudgetLimit(change.payload));
      break;
    case 'budgetPeriod':
      await db.budgetPeriods.put(normalizeBudgetPeriod(change.payload));
      break;
    default:
      break;
  }
}

export function createLocalAccount(
  workspaceId: string,
  values: {
    name: string;
    type: Account['type'];
    currency: string;
    openingBalance: string;
  },
) {
  const now = new Date().toISOString();
  const record: Account = {
    id: crypto.randomUUID(),
    workspaceId,
    name: values.name,
    type: values.type,
    currency: values.currency,
    openingBalance: values.openingBalance,
    currentBalanceCached: values.openingBalance,
    isArchived: false,
    version: 0,
    createdAt: now,
    updatedAt: now,
    deletedAt: null,
  };
  return record;
}

export function updateLocalAccount(
  account: Account,
  values: {
    name: string;
    type: Account['type'];
    currency: string;
    openingBalance: string;
    isArchived?: boolean;
  },
) {
  const updatedAt = new Date().toISOString();
  return {
    ...account,
    name: values.name,
    type: values.type,
    currency: values.currency,
    openingBalance: values.openingBalance,
    isArchived: values.isArchived ?? account.isArchived,
    updatedAt,
  };
}

export function deleteLocalAccount(account: Account) {
  const updatedAt = new Date().toISOString();
  return {
    ...account,
    deletedAt: updatedAt,
    updatedAt,
  };
}

export function createLocalCategory(
  workspaceId: string,
  values: {
    name: string;
    kind: Category['kind'];
    color?: string;
  },
) {
  const now = new Date().toISOString();
  const record: Category = {
    id: crypto.randomUUID(),
    workspaceId,
    parentCategoryId: null,
    name: values.name,
    kind: values.kind,
    color: values.color ?? null,
    icon: null,
    isArchived: false,
    version: 0,
    createdAt: now,
    updatedAt: now,
    deletedAt: null,
  };
  return record;
}

export function createLocalTransaction(
  workspaceId: string,
  userId: string,
  values: {
    accountId: string;
    categoryId: string | null;
    type: Transaction['type'];
    amount: string;
    currency: string;
    description?: string;
    notes?: string;
    transactionDate: string;
  },
) {
  const now = new Date().toISOString();
  const record: Transaction = {
    id: crypto.randomUUID(),
    workspaceId,
    accountId: values.accountId,
    categoryId: values.categoryId,
    type: values.type,
    amount: values.amount,
    currency: values.currency,
    description: values.description ?? null,
    notes: values.notes ?? null,
    transactionDate: values.transactionDate,
    createdBy: userId,
    version: 0,
    createdAt: now,
    updatedAt: now,
    deletedAt: null,
  };
  return record;
}

export function applyLocalTransactionToAccount(
  account: Account,
  transaction: Pick<Transaction, 'type' | 'amount'>,
) {
  const amount = Number(transaction.amount);
  const direction =
    transaction.type === 'expense' ? -1 : transaction.type === 'income' ? 1 : 0;

  return {
    ...account,
    currentBalanceCached: (
      Number(account.currentBalanceCached) +
      amount * direction
    ).toFixed(2),
  };
}

export function createLocalBudgetPeriod(
  workspaceId: string,
  values: { startsAt: string; endsAt: string },
) {
  const now = new Date().toISOString();
  const record: BudgetPeriod = {
    id: crypto.randomUUID(),
    workspaceId,
    periodType: 'monthly',
    startsAt: values.startsAt,
    endsAt: values.endsAt,
    createdAt: now,
    updatedAt: now,
  };
  return record;
}

export function createLocalBudgetLimit(
  workspaceId: string,
  values: {
    budgetPeriodId: string;
    categoryId: string;
    amount: string;
    currency: string;
  },
) {
  const now = new Date().toISOString();
  const record: BudgetLimit = {
    id: crypto.randomUUID(),
    workspaceId,
    budgetPeriodId: values.budgetPeriodId,
    categoryId: values.categoryId,
    amount: values.amount,
    currency: values.currency,
    version: 0,
    createdAt: now,
    updatedAt: now,
    deletedAt: null,
  };
  return record;
}

async function applyAcceptedVersion(
  entityType: SyncOperation['entityType'],
  entityId: string,
  version: number,
) {
  switch (entityType) {
    case 'account': {
      const account = await db.accounts.get(entityId);
      if (account) {
        await db.accounts.put({ ...account, version });
      }
      break;
    }
    case 'category': {
      const category = await db.categories.get(entityId);
      if (category) {
        await db.categories.put({ ...category, version });
      }
      break;
    }
    case 'transaction': {
      const transaction = await db.transactions.get(entityId);
      if (transaction) {
        await db.transactions.put({ ...transaction, version });
      }
      break;
    }
    case 'budgetLimit': {
      const limit = await db.budgetLimits.get(entityId);
      if (limit) {
        await db.budgetLimits.put({ ...limit, version });
      }
      break;
    }
    case 'budgetPeriod':
      break;
    default:
      break;
  }
}

function normalizeAccount(payload: Record<string, unknown>): Account {
  return {
    id: String(payload.id),
    workspaceId: String(payload.workspaceId),
    name: String(payload.name),
    type: payload.type as Account['type'],
    currency: String(payload.currency),
    openingBalance: String(payload.openingBalance),
    currentBalanceCached: String(payload.currentBalanceCached),
    isArchived: Boolean(payload.isArchived),
    version: Number(payload.version ?? 1),
    createdAt: String(payload.createdAt),
    updatedAt: String(payload.updatedAt),
    deletedAt: payload.deletedAt ? String(payload.deletedAt) : null,
  };
}

function normalizeCategory(payload: Record<string, unknown>): Category {
  return {
    id: String(payload.id),
    workspaceId: String(payload.workspaceId),
    parentCategoryId: payload.parentCategoryId
      ? String(payload.parentCategoryId)
      : null,
    name: String(payload.name),
    kind: payload.kind as Category['kind'],
    color: payload.color ? String(payload.color) : null,
    icon: payload.icon ? String(payload.icon) : null,
    isArchived: Boolean(payload.isArchived),
    version: Number(payload.version ?? 1),
    createdAt: String(payload.createdAt),
    updatedAt: String(payload.updatedAt),
    deletedAt: payload.deletedAt ? String(payload.deletedAt) : null,
  };
}

function normalizeTransaction(payload: Record<string, unknown>): Transaction {
  return {
    id: String(payload.id),
    workspaceId: String(payload.workspaceId),
    accountId: String(payload.accountId),
    categoryId: payload.categoryId ? String(payload.categoryId) : null,
    type: payload.type as Transaction['type'],
    amount: String(payload.amount),
    currency: String(payload.currency),
    description: payload.description ? String(payload.description) : null,
    notes: payload.notes ? String(payload.notes) : null,
    transactionDate: String(payload.transactionDate).slice(0, 10),
    createdBy: String(payload.createdBy),
    version: Number(payload.version ?? 1),
    createdAt: String(payload.createdAt),
    updatedAt: String(payload.updatedAt),
    deletedAt: payload.deletedAt ? String(payload.deletedAt) : null,
  };
}

function normalizeBudgetLimit(payload: Record<string, unknown>): BudgetLimit {
  return {
    id: String(payload.id),
    workspaceId: String(payload.workspaceId),
    budgetPeriodId: String(payload.budgetPeriodId),
    categoryId: String(payload.categoryId),
    amount: String(payload.amount),
    currency: String(payload.currency),
    version: Number(payload.version ?? 1),
    createdAt: String(payload.createdAt),
    updatedAt: String(payload.updatedAt),
    deletedAt: payload.deletedAt ? String(payload.deletedAt) : null,
  };
}

function normalizeBudgetPeriod(payload: Record<string, unknown>): BudgetPeriod {
  return {
    id: String(payload.id),
    workspaceId: String(payload.workspaceId),
    periodType: 'monthly',
    startsAt: String(payload.startsAt).slice(0, 10),
    endsAt: String(payload.endsAt).slice(0, 10),
    createdAt: String(payload.createdAt),
    updatedAt: String(payload.updatedAt),
  };
}
