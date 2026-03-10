import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import type {
  CreateTransactionRequest,
  CreateTransferRequest,
  TransactionFilters,
  UpdateTransactionRequest,
} from '@finance/shared-types';

import { AuditService } from '../audit/audit.service';
import { ChangeLogService } from '../../database/change-log.service';
import { mapTransaction } from '../../database/mappers';
import { PrismaService } from '../../database/prisma.service';
import { WorkspaceAccessService } from '../../database/workspace-access.service';

@Injectable()
export class TransactionsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly workspaceAccessService: WorkspaceAccessService,
    private readonly changeLogService: ChangeLogService,
    private readonly auditService: AuditService,
  ) {}

  async list(userId: string, workspaceId: string, filters: TransactionFilters) {
    await this.workspaceAccessService.assertMembership(userId, workspaceId);

    const page = filters.page ?? 1;
    const pageSize = filters.pageSize ?? 20;

    const where: Prisma.TransactionWhereInput = {
      workspaceId,
      deletedAt: null,
      transactionDate:
        filters.from || filters.to
          ? {
              gte: filters.from ? new Date(filters.from) : undefined,
              lte: filters.to ? new Date(filters.to) : undefined,
            }
          : undefined,
      accountId: filters.accountId,
      categoryId: filters.categoryId,
      type: filters.type,
    };

    const [items, total] = await this.prisma.$transaction([
      this.prisma.transaction.findMany({
        where,
        orderBy: [{ transactionDate: 'desc' }, { createdAt: 'desc' }],
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      this.prisma.transaction.count({ where }),
    ]);

    return {
      items: items.map(mapTransaction),
      page,
      pageSize,
      total,
    };
  }

  async getDetail(userId: string, workspaceId: string, transactionId: string) {
    await this.workspaceAccessService.assertMembership(userId, workspaceId);

    const transaction = await this.requireTransaction(
      workspaceId,
      transactionId,
    );
    return mapTransaction(transaction);
  }

  async create(
    userId: string,
    workspaceId: string,
    input: CreateTransactionRequest,
  ) {
    await this.workspaceAccessService.assertMembership(
      userId,
      workspaceId,
      'editor',
    );
    await this.requireAccount(workspaceId, input.accountId);
    if (input.categoryId) {
      await this.requireCategory(workspaceId, input.categoryId);
    }

    const transaction = await this.prisma.transaction.create({
      data: {
        workspaceId,
        accountId: input.accountId,
        categoryId: input.categoryId ?? null,
        type: input.type,
        amount: new Prisma.Decimal(input.amount),
        currency: input.currency,
        description: input.description ?? null,
        notes: input.notes ?? null,
        transactionDate: new Date(input.transactionDate),
        createdBy: userId,
      },
    });

    await this.recalculateAccountBalance(input.accountId);
    await this.recordChange('create', workspaceId, userId, transaction);

    return mapTransaction(transaction);
  }

  async update(
    userId: string,
    workspaceId: string,
    transactionId: string,
    input: UpdateTransactionRequest,
  ) {
    await this.workspaceAccessService.assertMembership(
      userId,
      workspaceId,
      'editor',
    );
    const existing = await this.requireTransaction(workspaceId, transactionId);
    if (input.accountId) {
      await this.requireAccount(workspaceId, input.accountId);
    }
    if (input.categoryId) {
      await this.requireCategory(workspaceId, input.categoryId);
    }

    const transaction = await this.prisma.transaction.update({
      where: { id: transactionId },
      data: {
        accountId: input.accountId,
        categoryId: input.categoryId,
        type: input.type,
        amount: input.amount ? new Prisma.Decimal(input.amount) : undefined,
        currency: input.currency,
        description: input.description,
        notes: input.notes,
        transactionDate: input.transactionDate
          ? new Date(input.transactionDate)
          : undefined,
        version: {
          increment: 1,
        },
      },
    });

    await this.recalculateAccountBalance(existing.accountId);
    if (transaction.accountId !== existing.accountId) {
      await this.recalculateAccountBalance(transaction.accountId);
    }
    await this.recordChange('update', workspaceId, userId, transaction);

    return mapTransaction(transaction);
  }

  async remove(userId: string, workspaceId: string, transactionId: string) {
    await this.workspaceAccessService.assertMembership(
      userId,
      workspaceId,
      'editor',
    );
    const existing = await this.requireTransaction(workspaceId, transactionId);

    const transaction = await this.prisma.transaction.update({
      where: { id: transactionId },
      data: {
        deletedAt: new Date(),
        version: {
          increment: 1,
        },
      },
    });

    await this.recalculateAccountBalance(existing.accountId);
    await this.recordChange('delete', workspaceId, userId, transaction);

    return mapTransaction(transaction);
  }

  async createTransfer(
    userId: string,
    workspaceId: string,
    input: CreateTransferRequest,
  ) {
    await this.workspaceAccessService.assertMembership(
      userId,
      workspaceId,
      'editor',
    );
    await this.requireAccount(workspaceId, input.fromAccountId);
    await this.requireAccount(workspaceId, input.toAccountId);

    const amount = new Prisma.Decimal(input.amount);

    const result = await this.prisma.$transaction(async (tx) => {
      const outbound = await tx.transaction.create({
        data: {
          workspaceId,
          accountId: input.fromAccountId,
          categoryId: null,
          type: 'transfer',
          amount: amount.negated(),
          currency: input.currency,
          description: input.description ?? 'Transfer out',
          notes: null,
          transactionDate: new Date(input.transactionDate),
          createdBy: userId,
        },
      });

      const inbound = await tx.transaction.create({
        data: {
          workspaceId,
          accountId: input.toAccountId,
          categoryId: null,
          type: 'transfer',
          amount,
          currency: input.currency,
          description: input.description ?? 'Transfer in',
          notes: null,
          transactionDate: new Date(input.transactionDate),
          createdBy: userId,
        },
      });

      const transferLink = await tx.transferLink.create({
        data: {
          workspaceId,
          outboundTransactionId: outbound.id,
          inboundTransactionId: inbound.id,
        },
      });

      return { outbound, inbound, transferLink };
    });

    await Promise.all([
      this.recalculateAccountBalance(input.fromAccountId),
      this.recalculateAccountBalance(input.toAccountId),
      this.recordChange('create', workspaceId, userId, result.outbound),
      this.recordChange('create', workspaceId, userId, result.inbound),
    ]);

    return {
      transferId: result.transferLink.id,
      outboundTransaction: mapTransaction(result.outbound),
      inboundTransaction: mapTransaction(result.inbound),
    };
  }

  private async requireTransaction(workspaceId: string, transactionId: string) {
    const transaction = await this.prisma.transaction.findFirst({
      where: {
        id: transactionId,
        workspaceId,
      },
    });

    if (!transaction) {
      throw new NotFoundException({
        code: 'TRANSACTION_NOT_FOUND',
        message: 'Transaction not found',
      });
    }

    return transaction;
  }

  private async requireAccount(workspaceId: string, accountId: string) {
    const account = await this.prisma.account.findFirst({
      where: {
        id: accountId,
        workspaceId,
        deletedAt: null,
      },
    });

    if (!account) {
      throw new NotFoundException({
        code: 'ACCOUNT_NOT_FOUND',
        message: 'Account not found',
      });
    }

    return account;
  }

  private async requireCategory(workspaceId: string, categoryId: string) {
    const category = await this.prisma.category.findFirst({
      where: {
        id: categoryId,
        workspaceId,
        deletedAt: null,
      },
    });

    if (!category) {
      throw new NotFoundException({
        code: 'CATEGORY_NOT_FOUND',
        message: 'Category not found',
      });
    }

    return category;
  }

  private async recalculateAccountBalance(accountId: string) {
    const [account, transactions] = await Promise.all([
      this.prisma.account.findUnique({
        where: { id: accountId },
        select: {
          openingBalance: true,
        },
      }),
      this.prisma.transaction.findMany({
        where: {
          accountId,
          deletedAt: null,
        },
        select: {
          type: true,
          amount: true,
        },
      }),
    ]);

    const openingBalance = account?.openingBalance ?? new Prisma.Decimal(0);
    const total = transactions.reduce((sum, transaction) => {
      if (transaction.type === 'expense') {
        return sum.minus(transaction.amount);
      }

      if (transaction.type === 'income') {
        return sum.plus(transaction.amount);
      }

      return sum.plus(transaction.amount);
    }, openingBalance);

    await this.prisma.account.update({
      where: { id: accountId },
      data: {
        currentBalanceCached: total,
      },
    });
  }

  private async recordChange(
    operationType: 'create' | 'update' | 'delete',
    workspaceId: string,
    userId: string,
    transaction: {
      id: string;
      version: number;
    } & Record<string, unknown>,
  ) {
    await this.changeLogService.record({
      workspaceId,
      entityType: 'transaction',
      entityId: transaction.id,
      operationType,
      entityVersion: transaction.version,
      changedBy: userId,
      payloadSnapshot: transaction,
    });

    await this.auditService.record(`transaction.${operationType}`, {
      userId,
      workspaceId,
      metadata: { transactionId: transaction.id },
    });
  }
}
