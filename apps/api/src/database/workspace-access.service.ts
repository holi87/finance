import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type { MembershipRole } from '@finance/shared-types';

import { hasRequiredRole } from '../common/auth/role.utils';
import { PrismaService } from './prisma.service';

@Injectable()
export class WorkspaceAccessService {
  constructor(private readonly prisma: PrismaService) {}

  async assertMembership(
    userId: string,
    workspaceId: string,
    requiredRole?: MembershipRole,
  ) {
    const membership = await this.prisma.membership.findUnique({
      where: {
        workspaceId_userId: {
          workspaceId,
          userId,
        },
      },
    });

    if (!membership) {
      throw new NotFoundException({
        code: 'WORKSPACE_NOT_FOUND',
        message: 'Workspace not found for current user',
      });
    }

    if (requiredRole && !hasRequiredRole(membership.role, requiredRole)) {
      throw new ForbiddenException({
        code: 'FORBIDDEN',
        message: 'Insufficient workspace permissions',
      });
    }

    return membership;
  }
}
