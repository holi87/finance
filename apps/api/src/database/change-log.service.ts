import { Injectable } from '@nestjs/common';
import {
  Prisma,
  type SyncEntityType,
  type SyncOperationType,
} from '@prisma/client';

import { PrismaService } from './prisma.service';

@Injectable()
export class ChangeLogService {
  constructor(private readonly prisma: PrismaService) {}

  async record(params: {
    workspaceId: string;
    entityType: SyncEntityType;
    entityId: string;
    operationType: SyncOperationType;
    entityVersion: number;
    changedBy?: string | null;
    payloadSnapshot?: unknown;
  }) {
    await this.prisma.syncChange.create({
      data: {
        workspaceId: params.workspaceId,
        entityType: params.entityType,
        entityId: params.entityId,
        operationType: params.operationType,
        entityVersion: params.entityVersion,
        changedBy: params.changedBy ?? null,
        payloadSnapshot: params.payloadSnapshot
          ? (JSON.parse(
              JSON.stringify(params.payloadSnapshot),
            ) as Prisma.InputJsonValue)
          : Prisma.JsonNull,
      },
    });
  }
}
