import { Global, Module } from '@nestjs/common';

import { ChangeLogService } from './change-log.service';
import { WorkspaceAccessService } from './workspace-access.service';
import { PrismaService } from './prisma.service';

@Global()
@Module({
  providers: [PrismaService, WorkspaceAccessService, ChangeLogService],
  exports: [PrismaService, WorkspaceAccessService, ChangeLogService],
})
export class DatabaseModule {}
