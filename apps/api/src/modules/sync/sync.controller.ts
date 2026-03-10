import { Body, Controller, Get, Post, Query, UseGuards } from '@nestjs/common';

import { pullQuerySchema, pushSchema } from '@finance/shared-validation';
import type { PushRequest } from '@finance/shared-types';

import { CurrentUser } from '../../common/auth/current-user.decorator';
import { JwtAuthGuard } from '../../common/auth/jwt-auth.guard';
import type { RequestUser } from '../../common/auth/request-user.interface';
import { ZodValidationPipe } from '../../common/http/zod-validation.pipe';
import { SyncService } from './sync.service';

@Controller('sync')
@UseGuards(JwtAuthGuard)
export class SyncController {
  constructor(private readonly syncService: SyncService) {}

  @Post('push')
  push(
    @CurrentUser() user: RequestUser,
    @Body(new ZodValidationPipe(pushSchema)) body: PushRequest,
  ) {
    return this.syncService.push(user.id, body);
  }

  @Get('pull')
  pull(
    @CurrentUser() user: RequestUser,
    @Query(new ZodValidationPipe(pullQuerySchema))
    query: {
      workspaceId: string;
      cursor: number;
      limit: number;
      deviceId?: string;
    },
  ) {
    return this.syncService.pull(user.id, query);
  }
}
