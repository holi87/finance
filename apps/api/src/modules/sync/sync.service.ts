import { Injectable } from '@nestjs/common';
import {
  Prisma,
  type Account,
  type BudgetLimit,
  type Category,
  type SyncEntityType,
  type SyncOperationType,
  type Transaction,
} from '@prisma/client';
import {
  createAccountSchema,
  createBudgetLimitSchema,
  createBudgetPeriodSchema,
  createCategorySchema,
  createTransactionSchema,
  updateAccountSchema,
  updateBudgetLimitSchema,
  updateCategorySchema,
  updateTransactionSchema,
} from '@finance/shared-validation';
import type {
  PullResponse,
  PushRequest,
  PushResponse,
} from '@finance/shared-types';

import { AuditService } from '../audit/audit.service';
import { ChangeLogService } from '../../database/change-log.service';
import { PrismaService } from '../../database/prisma.service';
import { WorkspaceAccessService } from '../../database/workspace-access.service';

@Injectable()
export class SyncService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly workspaceAccessService: WorkspaceAccessService,
    private readonly changeLogService: ChangeLogService,
    private readonly auditService: AuditService,
  ) {}

  async push(userId: string, input: PushRequest): Promise<PushResponse> {
    await this.workspaceAccessService.assertMembership(
      userId,
      input.workspaceId,
      'editor',
    );
    await this.ensureDevice(userId, input.deviceId);

    const accepted: PushResponse['accepted'] = [];
    const rejected: PushResponse['rejected'] = [];

    for (const operation of input.operations) {
      const receipt = await this.prisma.syncOperationReceipt.findUnique({
        where: {
          operationId_deviceId: {
            operationId: operation.operationId,
            deviceId: input.deviceId,
          },
        },
      });

      if (receipt) {
        if (receipt.resultStatus === 'applied') {
          accepted.push({
            operationId: operation.operationId,
            entityType: operation.entityType,
            entityId: operation.entityId,
            newVersion: receipt.entityVersion,
            status: 'applied',
          });
        } else {
          rejected.push({
            operationId: operation.operationId,
            entityType: operation.entityType,
            entityId: operation.entityId,
            status: receipt.resultStatus === 'conflict' ? 'conflict' : 'failed',
            message: 'Operation already processed with failure',
          });
        }
        continue;
      }

      try {
        const result = await this.applyOperation(
          userId,
          input.workspaceId,
          operation,
        );

        await this.prisma.syncOperationReceipt.create({
          data: {
            operationId: operation.operationId,
            deviceId: input.deviceId,
            workspaceId: input.workspaceId,
            entityType: operation.entityType,
            entityId: operation.entityId,
            operationType: operation.operationType,
            entityVersion: result.version,
            resultStatus: 'applied',
          },
        });

        accepted.push({
          operationId: operation.operationId,
          entityType: operation.entityType,
          entityId: operation.entityId,
          newVersion: result.version,
          status: 'applied',
        });
      } catch (error) {
        const message =
          error instanceof Error ? error.message : 'Operation failed';
        const status = message.includes('version') ? 'conflict' : 'failed';

        await this.prisma.syncOperationReceipt.create({
          data: {
            operationId: operation.operationId,
            deviceId: input.deviceId,
            workspaceId: input.workspaceId,
            entityType: operation.entityType,
            entityId: operation.entityId,
            operationType: operation.operationType,
            entityVersion: operation.baseVersion,
            resultStatus: status,
          },
        });

        await this.auditService.record('sync.push.rejected', {
          userId,
          workspaceId: input.workspaceId,
          metadata: {
            operationId: operation.operationId,
            message,
          },
        });

        rejected.push({
          operationId: operation.operationId,
          entityType: operation.entityType,
          entityId: operation.entityId,
          status,
          message,
        });
      }
    }

    return { accepted, rejected };
  }

  async pull(
    userId: string,
    query: {
      workspaceId: string;
      cursor: number;
      limit: number;
      deviceId?: string;
    },
  ): Promise<PullResponse> {
    await this.workspaceAccessService.assertMembership(
      userId,
      query.workspaceId,
    );

    const changes = await this.prisma.syncChange.findMany({
      where: {
        workspaceId: query.workspaceId,
        id: {
          gt: BigInt(query.cursor),
        },
      },
      orderBy: {
        id: 'asc',
      },
      take: query.limit,
    });

    const nextCursor = changes.at(-1)?.id ?? BigInt(query.cursor);

    if (query.deviceId) {
      await this.ensureDevice(userId, query.deviceId);
      await this.prisma.syncCursor.upsert({
        where: {
          userId_deviceId_workspaceId: {
            userId,
            deviceId: query.deviceId,
            workspaceId: query.workspaceId,
          },
        },
        update: {
          lastPulledChangeId: nextCursor,
        },
        create: {
          userId,
          deviceId: query.deviceId,
          workspaceId: query.workspaceId,
          lastPulledChangeId: nextCursor,
        },
      });
    }

    return {
      changes: changes.map((change) => ({
        changeId: Number(change.id),
        entityType: change.entityType,
        entityId: change.entityId,
        operationType: change.operationType,
        version: change.entityVersion,
        changedAt: change.changedAt.toISOString(),
        payload: change.payloadSnapshot ?? {},
      })),
      nextCursor: Number(nextCursor),
      hasMore: changes.length === query.limit,
    };
  }

  private async applyOperation(
    userId: string,
    workspaceId: string,
    operation: PushRequest['operations'][number],
  ) {
    switch (operation.entityType) {
      case 'account':
        return this.applyAccountOperation(userId, workspaceId, operation);
      case 'category':
        return this.applyCategoryOperation(userId, workspaceId, operation);
      case 'transaction':
        return this.applyTransactionOperation(userId, workspaceId, operation);
      case 'budgetLimit':
        return this.applyBudgetLimitOperation(userId, workspaceId, operation);
      case 'budgetPeriod':
        return this.applyBudgetPeriodOperation(userId, workspaceId, operation);
      default:
        throw new Error(
          `Unsupported sync entity type: ${operation.entityType}`,
        );
    }
  }

  private async applyAccountOperation(
    userId: string,
    workspaceId: string,
    operation: PushRequest['operations'][number],
  ) {
    if (operation.operationType === 'create') {
      const payload = createAccountSchema.parse(operation.payload);
      const account = await this.prisma.account.upsert({
        where: { id: operation.entityId },
        update: {},
        create: {
          id: operation.entityId,
          workspaceId,
          name: payload.name,
          type: payload.type,
          currency: payload.currency,
          openingBalance: new Prisma.Decimal(payload.openingBalance),
          currentBalanceCached: new Prisma.Decimal(payload.openingBalance),
        },
      });
      await this.recordEntityChange(
        workspaceId,
        userId,
        'account',
        'create',
        account.id,
        account.version,
        account,
      );
      return account;
    }

    const current = await this.prisma.account.findFirst({
      where: { id: operation.entityId, workspaceId },
    });
    if (!current) {
      throw new Error('Account not found');
    }
    if (current.version !== operation.baseVersion) {
      throw new Error('Account version conflict');
    }

    if (operation.operationType === 'update') {
      const payload = updateAccountSchema.parse(operation.payload);
      const account = await this.prisma.account.update({
        where: { id: operation.entityId },
        data: {
          ...payload,
          openingBalance: payload.openingBalance
            ? new Prisma.Decimal(payload.openingBalance)
            : undefined,
          version: { increment: 1 },
        },
      });
      await this.recordEntityChange(
        workspaceId,
        userId,
        'account',
        'update',
        account.id,
        account.version,
        account,
      );
      return account;
    }

    const account = await this.prisma.account.update({
      where: { id: operation.entityId },
      data: {
        deletedAt: new Date(),
        version: { increment: 1 },
      },
    });
    await this.recordEntityChange(
      workspaceId,
      userId,
      'account',
      'delete',
      account.id,
      account.version,
      account,
    );
    return account;
  }

  private async applyCategoryOperation(
    userId: string,
    workspaceId: string,
    operation: PushRequest['operations'][number],
  ) {
    if (operation.operationType === 'create') {
      const payload = createCategorySchema.parse(operation.payload);
      const category = await this.prisma.category.upsert({
        where: { id: operation.entityId },
        update: {},
        create: {
          id: operation.entityId,
          workspaceId,
          name: payload.name,
          kind: payload.kind,
          color: payload.color ?? null,
          icon: payload.icon ?? null,
          parentCategoryId: payload.parentCategoryId ?? null,
        },
      });
      await this.recordEntityChange(
        workspaceId,
        userId,
        'category',
        'create',
        category.id,
        category.version,
        category,
      );
      return category;
    }

    const current = await this.prisma.category.findFirst({
      where: { id: operation.entityId, workspaceId },
    });
    if (!current) {
      throw new Error('Category not found');
    }
    if (current.version !== operation.baseVersion) {
      throw new Error('Category version conflict');
    }

    if (operation.operationType === 'update') {
      const payload = updateCategorySchema.parse(operation.payload);
      const category = await this.prisma.category.update({
        where: { id: operation.entityId },
        data: {
          ...payload,
          version: { increment: 1 },
        },
      });
      await this.recordEntityChange(
        workspaceId,
        userId,
        'category',
        'update',
        category.id,
        category.version,
        category,
      );
      return category;
    }

    const category = await this.prisma.category.update({
      where: { id: operation.entityId },
      data: {
        deletedAt: new Date(),
        version: { increment: 1 },
      },
    });
    await this.recordEntityChange(
      workspaceId,
      userId,
      'category',
      'delete',
      category.id,
      category.version,
      category,
    );
    return category;
  }

  private async applyTransactionOperation(
    userId: string,
    workspaceId: string,
    operation: PushRequest['operations'][number],
  ) {
    if (operation.operationType === 'create') {
      const payload = createTransactionSchema.parse(operation.payload);
      const transaction = await this.prisma.transaction.upsert({
        where: { id: operation.entityId },
        update: {},
        create: {
          id: operation.entityId,
          workspaceId,
          accountId: payload.accountId,
          categoryId: payload.categoryId ?? null,
          type: payload.type,
          amount: new Prisma.Decimal(payload.amount),
          currency: payload.currency,
          description: payload.description ?? null,
          notes: payload.notes ?? null,
          transactionDate: new Date(payload.transactionDate),
          createdBy: userId,
        },
      });
      await this.recalculateAccountBalance(transaction.accountId);
      await this.recordEntityChange(
        workspaceId,
        userId,
        'transaction',
        'create',
        transaction.id,
        transaction.version,
        transaction,
      );
      return transaction;
    }

    const current = await this.prisma.transaction.findFirst({
      where: { id: operation.entityId, workspaceId },
    });
    if (!current) {
      throw new Error('Transaction not found');
    }
    if (current.version !== operation.baseVersion) {
      throw new Error('Transaction version conflict');
    }

    if (operation.operationType === 'update') {
      const payload = updateTransactionSchema.parse(operation.payload);
      const transaction = await this.prisma.transaction.update({
        where: { id: operation.entityId },
        data: {
          ...payload,
          amount: payload.amount
            ? new Prisma.Decimal(payload.amount)
            : undefined,
          transactionDate: payload.transactionDate
            ? new Date(payload.transactionDate)
            : undefined,
          version: { increment: 1 },
        },
      });
      await this.recalculateAccountBalance(current.accountId);
      if (transaction.accountId !== current.accountId) {
        await this.recalculateAccountBalance(transaction.accountId);
      }
      await this.recordEntityChange(
        workspaceId,
        userId,
        'transaction',
        'update',
        transaction.id,
        transaction.version,
        transaction,
      );
      return transaction;
    }

    const transaction = await this.prisma.transaction.update({
      where: { id: operation.entityId },
      data: {
        deletedAt: new Date(),
        version: { increment: 1 },
      },
    });
    await this.recalculateAccountBalance(transaction.accountId);
    await this.recordEntityChange(
      workspaceId,
      userId,
      'transaction',
      'delete',
      transaction.id,
      transaction.version,
      transaction,
    );
    return transaction;
  }

  private async applyBudgetLimitOperation(
    userId: string,
    workspaceId: string,
    operation: PushRequest['operations'][number],
  ) {
    if (operation.operationType === 'create') {
      const payload = createBudgetLimitSchema.parse(operation.payload);
      const limit = await this.prisma.budgetLimit.upsert({
        where: { id: operation.entityId },
        update: {},
        create: {
          id: operation.entityId,
          workspaceId,
          budgetPeriodId: payload.budgetPeriodId,
          categoryId: payload.categoryId,
          amount: new Prisma.Decimal(payload.amount),
          currency: payload.currency,
        },
      });
      await this.recordEntityChange(
        workspaceId,
        userId,
        'budgetLimit',
        'create',
        limit.id,
        limit.version,
        limit,
      );
      return limit;
    }

    const current = await this.prisma.budgetLimit.findFirst({
      where: { id: operation.entityId, workspaceId },
    });
    if (!current) {
      throw new Error('Budget limit not found');
    }
    if (current.version !== operation.baseVersion) {
      throw new Error('Budget limit version conflict');
    }

    if (operation.operationType === 'update') {
      const payload = updateBudgetLimitSchema.parse(operation.payload);
      const limit = await this.prisma.budgetLimit.update({
        where: { id: operation.entityId },
        data: {
          amount: payload.amount
            ? new Prisma.Decimal(payload.amount)
            : undefined,
          currency: payload.currency,
          version: { increment: 1 },
        },
      });
      await this.recordEntityChange(
        workspaceId,
        userId,
        'budgetLimit',
        'update',
        limit.id,
        limit.version,
        limit,
      );
      return limit;
    }

    const limit = await this.prisma.budgetLimit.update({
      where: { id: operation.entityId },
      data: {
        deletedAt: new Date(),
        version: { increment: 1 },
      },
    });
    await this.recordEntityChange(
      workspaceId,
      userId,
      'budgetLimit',
      'delete',
      limit.id,
      limit.version,
      limit,
    );
    return limit;
  }

  private async applyBudgetPeriodOperation(
    userId: string,
    workspaceId: string,
    operation: PushRequest['operations'][number],
  ) {
    if (operation.operationType !== 'create') {
      throw new Error('Budget period sync currently supports create only');
    }

    const payload = createBudgetPeriodSchema.parse(operation.payload);
    const period = await this.prisma.budgetPeriod.upsert({
      where: { id: operation.entityId },
      update: {},
      create: {
        id: operation.entityId,
        workspaceId,
        periodType: payload.periodType,
        startsAt: new Date(payload.startsAt),
        endsAt: new Date(payload.endsAt),
      },
    });

    await this.recordEntityChange(
      workspaceId,
      userId,
      'budgetPeriod',
      'create',
      period.id,
      1,
      period as never,
    );
    return { ...period, version: 1 };
  }

  private async ensureDevice(userId: string, deviceId: string) {
    await this.prisma.device.upsert({
      where: { id: deviceId },
      update: {
        lastSeenAt: new Date(),
      },
      create: {
        id: deviceId,
        userId,
        deviceName: 'Web client',
        platform: 'web',
        lastSeenAt: new Date(),
      },
    });
  }

  private async recalculateAccountBalance(accountId: string) {
    const transactions = await this.prisma.transaction.findMany({
      where: {
        accountId,
        deletedAt: null,
      },
      select: {
        type: true,
        amount: true,
      },
    });

    const total = transactions.reduce((sum, transaction) => {
      if (transaction.type === 'expense') {
        return sum.minus(transaction.amount);
      }
      return sum.plus(transaction.amount);
    }, new Prisma.Decimal(0));

    await this.prisma.account.update({
      where: { id: accountId },
      data: { currentBalanceCached: total },
    });
  }

  private async recordEntityChange(
    workspaceId: string,
    userId: string,
    entityType: SyncEntityType,
    operationType: SyncOperationType,
    entityId: string,
    version: number,
    payloadSnapshot: Account | Category | Transaction | BudgetLimit,
  ) {
    await this.changeLogService.record({
      workspaceId,
      entityType,
      entityId,
      operationType,
      entityVersion: version,
      changedBy: userId,
      payloadSnapshot,
    });
  }
}
