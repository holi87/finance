import { Prisma } from '@prisma/client';
import { Injectable } from '@nestjs/common';

import { PrismaService } from '../../database/prisma.service';

@Injectable()
export class AuditService {
  constructor(private readonly prisma: PrismaService) {}

  async record(
    action: string,
    params?: {
      userId?: string | null;
      workspaceId?: string | null;
      metadata?: unknown;
    },
  ) {
    await this.prisma.auditLog.create({
      data: {
        action,
        userId: params?.userId ?? null,
        workspaceId: params?.workspaceId ?? null,
        metadata: params?.metadata
          ? (JSON.parse(
              JSON.stringify(params.metadata),
            ) as Prisma.InputJsonValue)
          : Prisma.JsonNull,
      },
    });
  }
}
