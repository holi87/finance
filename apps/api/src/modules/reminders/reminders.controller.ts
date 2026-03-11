import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';

import {
  createReminderSchema,
  updateReminderSchema,
} from '@finance/shared-validation';
import type {
  CreateReminderRequest,
  Reminder,
  UpdateReminderRequest,
} from '@finance/shared-types';

import { CurrentUser } from '../../common/auth/current-user.decorator';
import { JwtAuthGuard } from '../../common/auth/jwt-auth.guard';
import type { RequestUser } from '../../common/auth/request-user.interface';
import { ZodValidationPipe } from '../../common/http/zod-validation.pipe';
import { RemindersService } from './reminders.service';

@Controller('workspaces/:workspaceId/reminders')
@UseGuards(JwtAuthGuard)
export class RemindersController {
  constructor(private readonly remindersService: RemindersService) {}

  @Get()
  list(
    @CurrentUser() user: RequestUser,
    @Param('workspaceId') workspaceId: string,
  ): Promise<Reminder[]> {
    return this.remindersService.list(user.id, workspaceId);
  }

  @Post()
  create(
    @CurrentUser() user: RequestUser,
    @Param('workspaceId') workspaceId: string,
    @Body(new ZodValidationPipe(createReminderSchema))
    body: CreateReminderRequest,
  ) {
    return this.remindersService.create(user.id, workspaceId, body);
  }

  @Patch(':reminderId')
  update(
    @CurrentUser() user: RequestUser,
    @Param('workspaceId') workspaceId: string,
    @Param('reminderId') reminderId: string,
    @Body(new ZodValidationPipe(updateReminderSchema))
    body: UpdateReminderRequest,
  ) {
    return this.remindersService.update(user.id, workspaceId, reminderId, body);
  }

  @Delete(':reminderId')
  remove(
    @CurrentUser() user: RequestUser,
    @Param('workspaceId') workspaceId: string,
    @Param('reminderId') reminderId: string,
  ) {
    return this.remindersService.remove(user.id, workspaceId, reminderId);
  }
}
