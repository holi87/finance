import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import type {
  CreateAccountRequest,
  UpdateAccountRequest,
} from '@finance/shared-types';

import { AuditService } from '../audit/audit.service';
import { ChangeLogService } from '../../database/change-log.service';
import { mapAccount } from '../../database/mappers';
import { PrismaService } from '../../database/prisma.service';
import { WorkspaceAccessService } from '../../database/workspace-access.service';

@Injectable()
export class AccountsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly workspaceAccessService: WorkspaceAccessService,
    private readonly changeLogService: ChangeLogService,
    private readonly auditService: AuditService,
  ) {}

  async list(userId: string, workspaceId: string) {
    await this.workspaceAccessService.assertMembership(userId, workspaceId);

    const accounts = await this.prisma.account.findMany({
      where: {
        workspaceId,
        deletedAt: null,
      },
      orderBy: {
        updatedAt: 'desc',
      },
    });

    return accounts.map(mapAccount);
  }

  async create(
    userId: string,
    workspaceId: string,
    input: CreateAccountRequest,
  ) {
    await this.workspaceAccessService.assertMembership(
      userId,
      workspaceId,
      'editor',
    );

    const account = await this.prisma.account.create({
      data: {
        workspaceId,
        name: input.name,
        type: input.type,
        currency: input.currency,
        openingBalance: new Prisma.Decimal(input.openingBalance),
        currentBalanceCached: new Prisma.Decimal(input.openingBalance),
      },
    });

    await this.changeLogService.record({
      workspaceId,
      entityType: 'account',
      entityId: account.id,
      operationType: 'create',
      entityVersion: account.version,
      changedBy: userId,
      payloadSnapshot: account,
    });

    await this.auditService.record('account.created', {
      userId,
      workspaceId,
      metadata: { accountId: account.id },
    });

    return mapAccount(account);
  }

  async update(
    userId: string,
    workspaceId: string,
    accountId: string,
    input: UpdateAccountRequest,
  ) {
    await this.workspaceAccessService.assertMembership(
      userId,
      workspaceId,
      'editor',
    );
    await this.requireAccount(workspaceId, accountId);

    const account = await this.prisma.account.update({
      where: { id: accountId },
      data: {
        name: input.name,
        type: input.type,
        currency: input.currency,
        openingBalance: input.openingBalance
          ? new Prisma.Decimal(input.openingBalance)
          : undefined,
        isArchived: input.isArchived,
        version: {
          increment: 1,
        },
      },
    });

    if (input.openingBalance) {
      await this.recalculateAccountBalance(account.id);
    }

    const current = await this.prisma.account.findUnique({
      where: { id: account.id },
    });

    await this.changeLogService.record({
      workspaceId,
      entityType: 'account',
      entityId: account.id,
      operationType: 'update',
      entityVersion: account.version,
      changedBy: userId,
      payloadSnapshot: account,
    });

    return mapAccount(current ?? account);
  }

  async remove(userId: string, workspaceId: string, accountId: string) {
    await this.workspaceAccessService.assertMembership(
      userId,
      workspaceId,
      'editor',
    );
    await this.requireAccount(workspaceId, accountId);

    const account = await this.prisma.account.update({
      where: { id: accountId },
      data: {
        deletedAt: new Date(),
        version: {
          increment: 1,
        },
      },
    });

    await this.changeLogService.record({
      workspaceId,
      entityType: 'account',
      entityId: account.id,
      operationType: 'delete',
      entityVersion: account.version,
      changedBy: userId,
      payloadSnapshot: account,
    });

    return mapAccount(account);
  }

  private async requireAccount(workspaceId: string, accountId: string) {
    const account = await this.prisma.account.findFirst({
      where: {
        id: accountId,
        workspaceId,
      },
    });

    if (!account) {
      throw new NotFoundException({
        code: 'ACCOUNT_NOT_FOUND',
        message: 'Account not found',
      });
    }
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

      return sum.plus(transaction.amount);
    }, openingBalance);

    await this.prisma.account.update({
      where: { id: accountId },
      data: {
        currentBalanceCached: total,
      },
    });
  }
}
