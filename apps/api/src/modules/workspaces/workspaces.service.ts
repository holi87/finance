import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type {
  AdminWorkspaceSummary,
  AddMemberRequest,
  CreateWorkspaceRequest,
  UpdateMemberRequest,
  UpdateWorkspaceRequest,
} from '@finance/shared-types';

import { AuditService } from '../audit/audit.service';
import { ChangeLogService } from '../../database/change-log.service';
import {
  mapAdminWorkspaceSummary,
  mapMembership,
  mapWorkspaceDetail,
  mapWorkspaceSummary,
  slugifyWorkspaceName,
} from '../../database/mappers';
import { PrismaService } from '../../database/prisma.service';
import { WorkspaceAccessService } from '../../database/workspace-access.service';

@Injectable()
export class WorkspacesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly workspaceAccessService: WorkspaceAccessService,
    private readonly changeLogService: ChangeLogService,
    private readonly auditService: AuditService,
  ) {}

  async list(userId: string) {
    const memberships = await this.prisma.membership.findMany({
      where: { userId },
      include: {
        workspace: true,
      },
      orderBy: {
        workspace: {
          name: 'asc',
        },
      },
    });

    return memberships.map((membership) =>
      mapWorkspaceSummary(membership.workspace, membership.role),
    );
  }

  async listAllForAdmin(userId: string): Promise<AdminWorkspaceSummary[]> {
    await this.assertSystemAdmin(userId);

    const workspaces = await this.prisma.workspace.findMany({
      include: {
        owner: {
          select: {
            id: true,
            email: true,
            displayName: true,
          },
        },
        _count: {
          select: {
            memberships: true,
            accounts: true,
            transactions: true,
          },
        },
      },
      orderBy: [{ archivedAt: 'asc' }, { updatedAt: 'desc' }, { name: 'asc' }],
    });

    return workspaces.map(mapAdminWorkspaceSummary);
  }

  async create(userId: string, input: CreateWorkspaceRequest) {
    const slugBase = slugifyWorkspaceName(input.name);
    const slug = await this.createUniqueSlug(userId, slugBase);

    const workspace = await this.prisma.workspace.create({
      data: {
        name: input.name,
        slug,
        type: input.type,
        baseCurrency: input.baseCurrency,
        ownerId: userId,
        memberships: {
          create: {
            userId,
            role: 'owner',
          },
        },
      },
    });

    await this.changeLogService.record({
      workspaceId: workspace.id,
      entityType: 'workspace',
      entityId: workspace.id,
      operationType: 'create',
      entityVersion: 1,
      changedBy: userId,
      payloadSnapshot: workspace,
    });

    await this.auditService.record('workspace.created', {
      userId,
      workspaceId: workspace.id,
      metadata: { name: workspace.name },
    });

    return mapWorkspaceDetail(workspace, 'owner');
  }

  async getDetail(userId: string, workspaceId: string) {
    const role = await this.resolveWorkspaceRole(userId, workspaceId);
    const workspace = await this.prisma.workspace.findUnique({
      where: { id: workspaceId },
    });

    if (!workspace) {
      throw new NotFoundException({
        code: 'WORKSPACE_NOT_FOUND',
        message: 'Workspace not found',
      });
    }

    return mapWorkspaceDetail(workspace, role);
  }

  async update(
    userId: string,
    workspaceId: string,
    input: UpdateWorkspaceRequest,
  ) {
    const role = await this.resolveWorkspaceRole(userId, workspaceId, 'owner');
    const workspace = await this.prisma.workspace.update({
      where: { id: workspaceId },
      data: {
        name: input.name,
        type: input.type,
        baseCurrency: input.baseCurrency,
        archivedAt: input.archivedAt
          ? new Date(input.archivedAt)
          : input.archivedAt,
      },
    });

    await this.changeLogService.record({
      workspaceId,
      entityType: 'workspace',
      entityId: workspace.id,
      operationType: 'update',
      entityVersion: 1,
      changedBy: userId,
      payloadSnapshot: workspace,
    });

    await this.auditService.record('workspace.updated', {
      userId,
      workspaceId,
      metadata: input,
    });

    return mapWorkspaceDetail(workspace, role);
  }

  async remove(userId: string, workspaceId: string) {
    await this.resolveWorkspaceRole(userId, workspaceId, 'owner');

    const workspace = await this.prisma.workspace.findUnique({
      where: { id: workspaceId },
      select: {
        id: true,
        name: true,
        ownerId: true,
      },
    });

    if (!workspace) {
      throw new NotFoundException({
        code: 'WORKSPACE_NOT_FOUND',
        message: 'Workspace not found',
      });
    }

    await this.prisma.workspace.delete({
      where: { id: workspaceId },
    });

    await this.auditService.record('workspace.deleted', {
      userId,
      metadata: {
        workspaceId,
        name: workspace.name,
        ownerId: workspace.ownerId,
      },
    });

    return { success: true, workspaceId };
  }

  async listMembers(userId: string, workspaceId: string) {
    await this.resolveWorkspaceRole(userId, workspaceId);

    const memberships = await this.prisma.membership.findMany({
      where: { workspaceId },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            displayName: true,
          },
        },
      },
      orderBy: {
        createdAt: 'asc',
      },
    });

    return memberships.map(mapMembership);
  }

  async addMember(
    userId: string,
    workspaceId: string,
    input: AddMemberRequest,
  ) {
    await this.resolveWorkspaceRole(userId, workspaceId, 'owner');

    const user = await this.prisma.user.findUnique({
      where: { id: input.userId },
    });
    if (!user) {
      throw new NotFoundException({
        code: 'USER_NOT_FOUND',
        message: 'Target user not found',
      });
    }

    const membership = await this.prisma.membership.upsert({
      where: {
        workspaceId_userId: {
          workspaceId,
          userId: input.userId,
        },
      },
      update: {
        role: input.role,
        invitedBy: userId,
      },
      create: {
        workspaceId,
        userId: input.userId,
        role: input.role,
        invitedBy: userId,
      },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            displayName: true,
          },
        },
      },
    });

    await this.auditService.record('workspace.member.upserted', {
      userId,
      workspaceId,
      metadata: { membershipId: membership.id, role: membership.role },
    });

    return mapMembership(membership);
  }

  async updateMember(
    userId: string,
    workspaceId: string,
    membershipId: string,
    input: UpdateMemberRequest,
  ) {
    await this.resolveWorkspaceRole(userId, workspaceId, 'owner');

    const membership = await this.prisma.membership.update({
      where: { id: membershipId },
      data: {
        role: input.role,
      },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            displayName: true,
          },
        },
      },
    });

    await this.auditService.record('workspace.member.updated', {
      userId,
      workspaceId,
      metadata: { membershipId: membership.id, role: membership.role },
    });

    return mapMembership(membership);
  }

  async removeMember(
    userId: string,
    workspaceId: string,
    membershipId: string,
  ) {
    await this.resolveWorkspaceRole(userId, workspaceId, 'owner');

    const membership = await this.prisma.membership.findUnique({
      where: { id: membershipId },
      include: {
        workspace: {
          select: {
            ownerId: true,
          },
        },
        user: {
          select: {
            id: true,
            email: true,
            displayName: true,
          },
        },
      },
    });

    if (!membership || membership.workspaceId !== workspaceId) {
      throw new NotFoundException({
        code: 'MEMBERSHIP_NOT_FOUND',
        message: 'Membership not found',
      });
    }

    if (membership.userId === membership.workspace.ownerId) {
      throw new BadRequestException({
        code: 'CANNOT_REMOVE_OWNER',
        message: 'Workspace owner membership cannot be removed',
      });
    }

    await this.prisma.membership.delete({
      where: { id: membershipId },
    });

    await this.auditService.record('workspace.member.removed', {
      userId,
      workspaceId,
      metadata: {
        membershipId,
        removedUserId: membership.userId,
      },
    });

    return {
      success: true,
      membershipId,
      user: membership.user,
    };
  }

  private async createUniqueSlug(ownerId: string, slugBase: string) {
    let attempt = slugBase || 'workspace';
    let counter = 2;

    while (
      await this.prisma.workspace.findUnique({
        where: {
          ownerId_slug: {
            ownerId,
            slug: attempt,
          },
        },
      })
    ) {
      attempt = `${slugBase}-${counter}`;
      counter += 1;
    }

    return attempt;
  }

  private async resolveWorkspaceRole(
    userId: string,
    workspaceId: string,
    requiredRole?: 'owner' | 'editor' | 'viewer',
  ) {
    if (await this.isSystemAdmin(userId)) {
      const workspace = await this.prisma.workspace.findUnique({
        where: { id: workspaceId },
        select: { id: true },
      });

      if (!workspace) {
        throw new NotFoundException({
          code: 'WORKSPACE_NOT_FOUND',
          message: 'Workspace not found',
        });
      }

      return 'owner' as const;
    }

    const membership = await this.workspaceAccessService.assertMembership(
      userId,
      workspaceId,
      requiredRole,
    );

    return membership.role;
  }

  private async assertSystemAdmin(userId: string) {
    if (await this.isSystemAdmin(userId)) {
      return;
    }

    throw new ForbiddenException({
      code: 'ADMIN_REQUIRED',
      message: 'System admin access is required',
    });
  }

  private async isSystemAdmin(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { isSystemAdmin: true },
    });

    return Boolean(user?.isSystemAdmin);
  }
}
