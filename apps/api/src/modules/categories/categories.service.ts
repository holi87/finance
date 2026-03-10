import { Injectable, NotFoundException } from '@nestjs/common';
import type {
  CreateCategoryRequest,
  UpdateCategoryRequest,
} from '@finance/shared-types';

import { AuditService } from '../audit/audit.service';
import { ChangeLogService } from '../../database/change-log.service';
import { mapCategory } from '../../database/mappers';
import { PrismaService } from '../../database/prisma.service';
import { WorkspaceAccessService } from '../../database/workspace-access.service';

@Injectable()
export class CategoriesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly workspaceAccessService: WorkspaceAccessService,
    private readonly changeLogService: ChangeLogService,
    private readonly auditService: AuditService,
  ) {}

  async list(userId: string, workspaceId: string) {
    await this.workspaceAccessService.assertMembership(userId, workspaceId);

    const categories = await this.prisma.category.findMany({
      where: {
        workspaceId,
        deletedAt: null,
      },
      orderBy: [{ kind: 'asc' }, { name: 'asc' }],
    });

    return categories.map(mapCategory);
  }

  async create(
    userId: string,
    workspaceId: string,
    input: CreateCategoryRequest,
  ) {
    await this.workspaceAccessService.assertMembership(
      userId,
      workspaceId,
      'editor',
    );

    const category = await this.prisma.category.create({
      data: {
        workspaceId,
        name: input.name,
        kind: input.kind,
        color: input.color ?? null,
        icon: input.icon ?? null,
        parentCategoryId: input.parentCategoryId ?? null,
      },
    });

    await this.changeLogService.record({
      workspaceId,
      entityType: 'category',
      entityId: category.id,
      operationType: 'create',
      entityVersion: category.version,
      changedBy: userId,
      payloadSnapshot: category,
    });

    await this.auditService.record('category.created', {
      userId,
      workspaceId,
      metadata: { categoryId: category.id },
    });

    return mapCategory(category);
  }

  async update(
    userId: string,
    workspaceId: string,
    categoryId: string,
    input: UpdateCategoryRequest,
  ) {
    await this.workspaceAccessService.assertMembership(
      userId,
      workspaceId,
      'editor',
    );
    await this.requireCategory(workspaceId, categoryId);

    const category = await this.prisma.category.update({
      where: { id: categoryId },
      data: {
        name: input.name,
        kind: input.kind,
        color: input.color,
        icon: input.icon,
        parentCategoryId: input.parentCategoryId,
        isArchived: input.isArchived,
        version: {
          increment: 1,
        },
      },
    });

    await this.changeLogService.record({
      workspaceId,
      entityType: 'category',
      entityId: category.id,
      operationType: 'update',
      entityVersion: category.version,
      changedBy: userId,
      payloadSnapshot: category,
    });

    return mapCategory(category);
  }

  async remove(userId: string, workspaceId: string, categoryId: string) {
    await this.workspaceAccessService.assertMembership(
      userId,
      workspaceId,
      'editor',
    );
    await this.requireCategory(workspaceId, categoryId);

    const category = await this.prisma.category.update({
      where: { id: categoryId },
      data: {
        deletedAt: new Date(),
        version: {
          increment: 1,
        },
      },
    });

    await this.changeLogService.record({
      workspaceId,
      entityType: 'category',
      entityId: category.id,
      operationType: 'delete',
      entityVersion: category.version,
      changedBy: userId,
      payloadSnapshot: category,
    });

    return mapCategory(category);
  }

  private async requireCategory(workspaceId: string, categoryId: string) {
    const category = await this.prisma.category.findFirst({
      where: {
        id: categoryId,
        workspaceId,
      },
    });

    if (!category) {
      throw new NotFoundException({
        code: 'CATEGORY_NOT_FOUND',
        message: 'Category not found',
      });
    }
  }
}
