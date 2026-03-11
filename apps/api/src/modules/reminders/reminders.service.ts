import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import type {
  CreateReminderRequest,
  UpdateReminderRequest,
} from '@finance/shared-types';

import { AuditService } from '../audit/audit.service';
import { ChangeLogService } from '../../database/change-log.service';
import { mapReminder } from '../../database/mappers';
import { PrismaService } from '../../database/prisma.service';
import { WorkspaceAccessService } from '../../database/workspace-access.service';

@Injectable()
export class RemindersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly workspaceAccessService: WorkspaceAccessService,
    private readonly changeLogService: ChangeLogService,
    private readonly auditService: AuditService,
  ) {}

  async list(userId: string, workspaceId: string) {
    await this.workspaceAccessService.assertMembership(userId, workspaceId);

    const reminders = await this.prisma.reminder.findMany({
      where: {
        workspaceId,
        deletedAt: null,
      },
      orderBy: [{ isActive: 'desc' }, { updatedAt: 'desc' }, { title: 'asc' }],
    });

    return reminders.map(mapReminder);
  }

  async create(
    userId: string,
    workspaceId: string,
    input: CreateReminderRequest,
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

    const reminder = await this.prisma.reminder.create({
      data: {
        workspaceId,
        title: input.title,
        notes: input.notes ?? null,
        amount: new Prisma.Decimal(input.amount),
        currency: input.currency,
        accountId: input.accountId,
        categoryId: input.categoryId ?? null,
        scheduleType: input.scheduleType,
        dueDate: input.dueDate ? new Date(input.dueDate) : null,
        dueDayOfMonth: input.dueDayOfMonth ?? null,
      },
    });

    await this.recordChange('create', workspaceId, userId, reminder);

    return mapReminder(reminder);
  }

  async update(
    userId: string,
    workspaceId: string,
    reminderId: string,
    input: UpdateReminderRequest,
  ) {
    await this.workspaceAccessService.assertMembership(
      userId,
      workspaceId,
      'editor',
    );
    await this.requireReminder(workspaceId, reminderId);

    if (input.accountId) {
      await this.requireAccount(workspaceId, input.accountId);
    }
    if (input.categoryId) {
      await this.requireCategory(workspaceId, input.categoryId);
    }

    const reminder = await this.prisma.reminder.update({
      where: { id: reminderId },
      data: {
        title: input.title,
        notes: input.notes,
        amount: input.amount ? new Prisma.Decimal(input.amount) : undefined,
        currency: input.currency,
        accountId: input.accountId,
        categoryId: input.categoryId,
        scheduleType: input.scheduleType,
        dueDate:
          input.dueDate === undefined
            ? undefined
            : input.dueDate
              ? new Date(input.dueDate)
              : null,
        dueDayOfMonth:
          input.dueDayOfMonth === undefined ? undefined : input.dueDayOfMonth,
        isActive: input.isActive,
        lastCompletedAt:
          input.lastCompletedAt === undefined
            ? undefined
            : input.lastCompletedAt
              ? new Date(input.lastCompletedAt)
              : null,
        version: {
          increment: 1,
        },
      },
    });

    await this.recordChange('update', workspaceId, userId, reminder);

    return mapReminder(reminder);
  }

  async remove(userId: string, workspaceId: string, reminderId: string) {
    await this.workspaceAccessService.assertMembership(
      userId,
      workspaceId,
      'editor',
    );
    await this.requireReminder(workspaceId, reminderId);

    const reminder = await this.prisma.reminder.update({
      where: { id: reminderId },
      data: {
        deletedAt: new Date(),
        version: {
          increment: 1,
        },
      },
    });

    await this.recordChange('delete', workspaceId, userId, reminder);

    return mapReminder(reminder);
  }

  private async requireReminder(workspaceId: string, reminderId: string) {
    const reminder = await this.prisma.reminder.findFirst({
      where: {
        id: reminderId,
        workspaceId,
      },
    });

    if (!reminder) {
      throw new NotFoundException({
        code: 'REMINDER_NOT_FOUND',
        message: 'Reminder not found',
      });
    }

    return reminder;
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

  private async recordChange(
    operationType: 'create' | 'update' | 'delete',
    workspaceId: string,
    userId: string,
    reminder: {
      id: string;
      version: number;
    } & Record<string, unknown>,
  ) {
    await this.changeLogService.record({
      workspaceId,
      entityType: 'reminder',
      entityId: reminder.id,
      operationType,
      entityVersion: reminder.version,
      changedBy: userId,
      payloadSnapshot: reminder,
    });

    await this.auditService.record(`reminder.${operationType}`, {
      userId,
      workspaceId,
      metadata: { reminderId: reminder.id },
    });
  }
}
