import type {
  Account,
  BudgetLimit,
  BudgetPeriod,
  Category,
  Membership,
  Transaction,
  User,
  WorkspaceDetail,
  WorkspaceSummary,
} from '@finance/shared-types';
import type {
  Account as PrismaAccount,
  BudgetLimit as PrismaBudgetLimit,
  BudgetPeriod as PrismaBudgetPeriod,
  Category as PrismaCategory,
  Membership as PrismaMembership,
  Prisma,
  Transaction as PrismaTransaction,
  User as PrismaUser,
  Workspace as PrismaWorkspace,
} from '@prisma/client';

export function toIsoDate(value: Date): string {
  return value.toISOString().slice(0, 10);
}

export function toIsoDateTime(value: Date | null): string | null {
  return value ? value.toISOString() : null;
}

export function toMoneyString(value: Prisma.Decimal | number | bigint): string {
  if (typeof value === 'number') {
    return value.toFixed(2);
  }

  if (typeof value === 'bigint') {
    return Number(value).toString();
  }

  return value.toFixed(2);
}

export function mapUser(user: PrismaUser): User {
  return {
    id: user.id,
    email: user.email,
    displayName: user.displayName,
    isActive: user.isActive,
    createdAt: user.createdAt.toISOString(),
    updatedAt: user.updatedAt.toISOString(),
    lastLoginAt: toIsoDateTime(user.lastLoginAt),
  };
}

export function mapWorkspaceSummary(
  workspace: PrismaWorkspace,
  role: Membership['role'],
): WorkspaceSummary {
  return {
    id: workspace.id,
    name: workspace.name,
    slug: workspace.slug,
    type: workspace.type,
    baseCurrency: workspace.baseCurrency,
    role,
  };
}

export function mapWorkspaceDetail(
  workspace: PrismaWorkspace,
  role: Membership['role'],
): WorkspaceDetail {
  return {
    ...mapWorkspaceSummary(workspace, role),
    ownerId: workspace.ownerId,
    archivedAt: toIsoDateTime(workspace.archivedAt),
    createdAt: workspace.createdAt.toISOString(),
    updatedAt: workspace.updatedAt.toISOString(),
  };
}

export function mapMembership(
  membership: PrismaMembership & {
    user?: Pick<PrismaUser, 'id' | 'email' | 'displayName'> | null;
  },
): Membership {
  return {
    id: membership.id,
    workspaceId: membership.workspaceId,
    userId: membership.userId,
    role: membership.role,
    invitedBy: membership.invitedBy,
    createdAt: membership.createdAt.toISOString(),
    updatedAt: membership.updatedAt.toISOString(),
    user: membership.user
      ? {
          id: membership.user.id,
          email: membership.user.email,
          displayName: membership.user.displayName,
        }
      : undefined,
  };
}

export function mapAccount(account: PrismaAccount): Account {
  return {
    id: account.id,
    workspaceId: account.workspaceId,
    name: account.name,
    type: account.type,
    currency: account.currency,
    openingBalance: toMoneyString(account.openingBalance),
    currentBalanceCached: toMoneyString(account.currentBalanceCached),
    isArchived: account.isArchived,
    version: account.version,
    createdAt: account.createdAt.toISOString(),
    updatedAt: account.updatedAt.toISOString(),
    deletedAt: toIsoDateTime(account.deletedAt),
  };
}

export function mapCategory(category: PrismaCategory): Category {
  return {
    id: category.id,
    workspaceId: category.workspaceId,
    parentCategoryId: category.parentCategoryId,
    name: category.name,
    kind: category.kind,
    color: category.color,
    icon: category.icon,
    isArchived: category.isArchived,
    version: category.version,
    createdAt: category.createdAt.toISOString(),
    updatedAt: category.updatedAt.toISOString(),
    deletedAt: toIsoDateTime(category.deletedAt),
  };
}

export function mapTransaction(transaction: PrismaTransaction): Transaction {
  return {
    id: transaction.id,
    workspaceId: transaction.workspaceId,
    accountId: transaction.accountId,
    categoryId: transaction.categoryId,
    type: transaction.type,
    amount: toMoneyString(transaction.amount),
    currency: transaction.currency,
    description: transaction.description,
    notes: transaction.notes,
    transactionDate: toIsoDate(transaction.transactionDate),
    createdBy: transaction.createdBy,
    version: transaction.version,
    createdAt: transaction.createdAt.toISOString(),
    updatedAt: transaction.updatedAt.toISOString(),
    deletedAt: toIsoDateTime(transaction.deletedAt),
  };
}

export function mapBudgetPeriod(period: PrismaBudgetPeriod): BudgetPeriod {
  return {
    id: period.id,
    workspaceId: period.workspaceId,
    periodType: period.periodType,
    startsAt: toIsoDate(period.startsAt),
    endsAt: toIsoDate(period.endsAt),
    createdAt: period.createdAt.toISOString(),
    updatedAt: period.updatedAt.toISOString(),
  };
}

export function mapBudgetLimit(limit: PrismaBudgetLimit): BudgetLimit {
  return {
    id: limit.id,
    workspaceId: limit.workspaceId,
    budgetPeriodId: limit.budgetPeriodId,
    categoryId: limit.categoryId,
    amount: toMoneyString(limit.amount),
    currency: limit.currency,
    version: limit.version,
    createdAt: limit.createdAt.toISOString(),
    updatedAt: limit.updatedAt.toISOString(),
    deletedAt: toIsoDateTime(limit.deletedAt),
  };
}

export function slugifyWorkspaceName(name: string): string {
  return name
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}
