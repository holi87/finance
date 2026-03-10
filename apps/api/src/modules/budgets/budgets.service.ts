import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import type {
  CreateBudgetLimitRequest,
  CreateBudgetPeriodRequest,
  UpdateBudgetLimitRequest,
} from '@finance/shared-types';

import { AuditService } from '../audit/audit.service';
import { ChangeLogService } from '../../database/change-log.service';
import { mapBudgetLimit, mapBudgetPeriod } from '../../database/mappers';
import { PrismaService } from '../../database/prisma.service';
import { WorkspaceAccessService } from '../../database/workspace-access.service';

@Injectable()
export class BudgetsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly workspaceAccessService: WorkspaceAccessService,
    private readonly changeLogService: ChangeLogService,
    private readonly auditService: AuditService,
  ) {}

  async listPeriods(userId: string, workspaceId: string) {
    await this.workspaceAccessService.assertMembership(userId, workspaceId);

    const periods = await this.prisma.budgetPeriod.findMany({
      where: { workspaceId },
      orderBy: { startsAt: 'desc' },
    });

    return periods.map(mapBudgetPeriod);
  }

  async createPeriod(
    userId: string,
    workspaceId: string,
    input: CreateBudgetPeriodRequest,
  ) {
    await this.workspaceAccessService.assertMembership(
      userId,
      workspaceId,
      'editor',
    );

    const period = await this.prisma.budgetPeriod.create({
      data: {
        workspaceId,
        periodType: input.periodType,
        startsAt: new Date(input.startsAt),
        endsAt: new Date(input.endsAt),
      },
    });

    await this.changeLogService.record({
      workspaceId,
      entityType: 'budgetPeriod',
      entityId: period.id,
      operationType: 'create',
      entityVersion: 1,
      changedBy: userId,
      payloadSnapshot: period,
    });

    await this.auditService.record('budget.period.created', {
      userId,
      workspaceId,
      metadata: { budgetPeriodId: period.id },
    });

    return mapBudgetPeriod(period);
  }

  async listLimits(userId: string, workspaceId: string) {
    await this.workspaceAccessService.assertMembership(userId, workspaceId);

    const limits = await this.prisma.budgetLimit.findMany({
      where: {
        workspaceId,
        deletedAt: null,
      },
      orderBy: [{ budgetPeriod: { startsAt: 'desc' } }, { createdAt: 'desc' }],
    });

    return limits.map(mapBudgetLimit);
  }

  async createLimit(
    userId: string,
    workspaceId: string,
    input: CreateBudgetLimitRequest,
  ) {
    await this.workspaceAccessService.assertMembership(
      userId,
      workspaceId,
      'editor',
    );
    await this.requireBudgetPeriod(workspaceId, input.budgetPeriodId);
    await this.requireCategory(workspaceId, input.categoryId);

    const limit = await this.prisma.budgetLimit.create({
      data: {
        workspaceId,
        budgetPeriodId: input.budgetPeriodId,
        categoryId: input.categoryId,
        amount: new Prisma.Decimal(input.amount),
        currency: input.currency,
      },
    });

    await this.recordChange('create', workspaceId, userId, limit);

    return mapBudgetLimit(limit);
  }

  async updateLimit(
    userId: string,
    workspaceId: string,
    budgetLimitId: string,
    input: UpdateBudgetLimitRequest,
  ) {
    await this.workspaceAccessService.assertMembership(
      userId,
      workspaceId,
      'editor',
    );
    await this.requireLimit(workspaceId, budgetLimitId);

    const limit = await this.prisma.budgetLimit.update({
      where: { id: budgetLimitId },
      data: {
        amount: input.amount ? new Prisma.Decimal(input.amount) : undefined,
        currency: input.currency,
        version: {
          increment: 1,
        },
      },
    });

    await this.recordChange('update', workspaceId, userId, limit);

    return mapBudgetLimit(limit);
  }

  async removeLimit(
    userId: string,
    workspaceId: string,
    budgetLimitId: string,
  ) {
    await this.workspaceAccessService.assertMembership(
      userId,
      workspaceId,
      'editor',
    );
    await this.requireLimit(workspaceId, budgetLimitId);

    const limit = await this.prisma.budgetLimit.update({
      where: { id: budgetLimitId },
      data: {
        deletedAt: new Date(),
        version: {
          increment: 1,
        },
      },
    });

    await this.recordChange('delete', workspaceId, userId, limit);

    return mapBudgetLimit(limit);
  }

  private async recordChange(
    operationType: 'create' | 'update' | 'delete',
    workspaceId: string,
    userId: string,
    limit: {
      id: string;
      version: number;
    } & Record<string, unknown>,
  ) {
    await this.changeLogService.record({
      workspaceId,
      entityType: 'budgetLimit',
      entityId: limit.id,
      operationType,
      entityVersion: limit.version,
      changedBy: userId,
      payloadSnapshot: limit,
    });

    await this.auditService.record(`budget.limit.${operationType}`, {
      userId,
      workspaceId,
      metadata: { budgetLimitId: limit.id },
    });
  }

  private async requireBudgetPeriod(
    workspaceId: string,
    budgetPeriodId: string,
  ) {
    const period = await this.prisma.budgetPeriod.findFirst({
      where: {
        id: budgetPeriodId,
        workspaceId,
      },
    });

    if (!period) {
      throw new NotFoundException({
        code: 'BUDGET_PERIOD_NOT_FOUND',
        message: 'Budget period not found',
      });
    }

    return period;
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

  private async requireLimit(workspaceId: string, budgetLimitId: string) {
    const limit = await this.prisma.budgetLimit.findFirst({
      where: {
        id: budgetLimitId,
        workspaceId,
      },
    });

    if (!limit) {
      throw new NotFoundException({
        code: 'BUDGET_LIMIT_NOT_FOUND',
        message: 'Budget limit not found',
      });
    }

    return limit;
  }
}
