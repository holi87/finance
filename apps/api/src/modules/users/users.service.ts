import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type {
  CreateUserRequest,
  UpdateUserRequest,
} from '@finance/shared-types';
import * as argon2 from 'argon2';

import { AuditService } from '../audit/audit.service';
import { mapUser, slugifyWorkspaceName } from '../../database/mappers';
import { PrismaService } from '../../database/prisma.service';

@Injectable()
export class UsersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
  ) {}

  async getMe(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundException({
        code: 'USER_NOT_FOUND',
        message: 'User not found',
      });
    }

    return mapUser(user);
  }

  async list(actorUserId: string) {
    await this.assertSystemAdmin(actorUserId);

    const users = await this.prisma.user.findMany({
      orderBy: [
        { isSystemAdmin: 'desc' },
        { isActive: 'desc' },
        { displayName: 'asc' },
        { email: 'asc' },
      ],
    });

    return users.map(mapUser);
  }

  async create(actorUserId: string, input: CreateUserRequest) {
    await this.assertSystemAdmin(actorUserId);

    const email = input.email.toLowerCase();
    const existing = await this.prisma.user.findUnique({
      where: { email },
    });

    if (existing) {
      throw new BadRequestException({
        code: 'EMAIL_ALREADY_USED',
        message: 'User with this email already exists',
      });
    }

    const passwordHash = await argon2.hash(input.password);
    const user = await this.prisma.$transaction(async (tx) => {
      const createdUser = await tx.user.create({
        data: {
          email,
          passwordHash,
          displayName: input.displayName,
          isActive: true,
          isSystemAdmin: input.isSystemAdmin ?? false,
        },
      });

      if (input.workspace) {
        const slug = slugifyWorkspaceName(input.workspace.name) || 'workspace';

        await tx.workspace.create({
          data: {
            name: input.workspace.name,
            slug,
            type: input.workspace.type,
            baseCurrency: input.workspace.baseCurrency,
            ownerId: createdUser.id,
            memberships: {
              create: {
                userId: createdUser.id,
                role: 'owner',
              },
            },
          },
        });
      }

      return createdUser;
    });

    await this.auditService.record('user.created', {
      userId: actorUserId,
      metadata: {
        createdUserId: user.id,
        email: user.email,
      },
    });

    return mapUser(user);
  }

  async update(actorUserId: string, userId: string, input: UpdateUserRequest) {
    await this.assertSystemAdmin(actorUserId);

    const current = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!current) {
      throw new NotFoundException({
        code: 'USER_NOT_FOUND',
        message: 'User not found',
      });
    }

    const nextEmail = input.email?.toLowerCase();
    if (nextEmail && nextEmail !== current.email) {
      const emailOwner = await this.prisma.user.findUnique({
        where: { email: nextEmail },
      });

      if (emailOwner && emailOwner.id !== userId) {
        throw new BadRequestException({
          code: 'EMAIL_ALREADY_USED',
          message: 'User with this email already exists',
        });
      }
    }

    const nextIsSystemAdmin = input.isSystemAdmin ?? current.isSystemAdmin;
    const nextIsActive = input.isActive ?? current.isActive;

    if (current.isSystemAdmin && (!nextIsSystemAdmin || !nextIsActive)) {
      await this.assertAnotherActiveSystemAdminExists(current.id);
    }

    const user = await this.prisma.user.update({
      where: { id: userId },
      data: {
        email: nextEmail,
        displayName: input.displayName,
        isActive: input.isActive,
        isSystemAdmin: input.isSystemAdmin,
        passwordHash: input.password
          ? await argon2.hash(input.password)
          : undefined,
      },
    });

    await this.auditService.record('user.updated', {
      userId: actorUserId,
      metadata: {
        targetUserId: user.id,
        email: user.email,
      },
    });

    return mapUser(user);
  }

  async remove(actorUserId: string, userId: string) {
    await this.assertSystemAdmin(actorUserId);

    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundException({
        code: 'USER_NOT_FOUND',
        message: 'User not found',
      });
    }

    if (user.isSystemAdmin) {
      await this.assertAnotherActiveSystemAdminExists(user.id);
    }

    await this.prisma.user.delete({
      where: { id: userId },
    });

    await this.auditService.record('user.deleted', {
      userId: actorUserId,
      metadata: {
        deletedUserId: userId,
        email: user.email,
      },
    });

    return { success: true, userId };
  }

  private async assertSystemAdmin(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { isSystemAdmin: true },
    });

    if (!user?.isSystemAdmin) {
      throw new ForbiddenException({
        code: 'ADMIN_REQUIRED',
        message: 'System admin access is required',
      });
    }
  }

  private async assertAnotherActiveSystemAdminExists(excludedUserId: string) {
    const otherActiveAdmins = await this.prisma.user.count({
      where: {
        id: {
          not: excludedUserId,
        },
        isActive: true,
        isSystemAdmin: true,
      },
    });

    if (otherActiveAdmins > 0) {
      return;
    }

    throw new BadRequestException({
      code: 'LAST_ADMIN_PROTECTED',
      message: 'At least one active system admin must remain',
    });
  }
}
