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
  createAccountSchema,
  updateAccountSchema,
} from '@finance/shared-validation';
import type {
  CreateAccountRequest,
  UpdateAccountRequest,
} from '@finance/shared-types';

import { CurrentUser } from '../../common/auth/current-user.decorator';
import { JwtAuthGuard } from '../../common/auth/jwt-auth.guard';
import type { RequestUser } from '../../common/auth/request-user.interface';
import { ZodValidationPipe } from '../../common/http/zod-validation.pipe';
import { AccountsService } from './accounts.service';

@Controller('workspaces/:workspaceId/accounts')
@UseGuards(JwtAuthGuard)
export class AccountsController {
  constructor(private readonly accountsService: AccountsService) {}

  @Get()
  list(
    @CurrentUser() user: RequestUser,
    @Param('workspaceId') workspaceId: string,
  ) {
    return this.accountsService.list(user.id, workspaceId);
  }

  @Post()
  create(
    @CurrentUser() user: RequestUser,
    @Param('workspaceId') workspaceId: string,
    @Body(new ZodValidationPipe(createAccountSchema))
    body: CreateAccountRequest,
  ) {
    return this.accountsService.create(user.id, workspaceId, body);
  }

  @Patch(':accountId')
  update(
    @CurrentUser() user: RequestUser,
    @Param('workspaceId') workspaceId: string,
    @Param('accountId') accountId: string,
    @Body(new ZodValidationPipe(updateAccountSchema))
    body: UpdateAccountRequest,
  ) {
    return this.accountsService.update(user.id, workspaceId, accountId, body);
  }

  @Delete(':accountId')
  remove(
    @CurrentUser() user: RequestUser,
    @Param('workspaceId') workspaceId: string,
    @Param('accountId') accountId: string,
  ) {
    return this.accountsService.remove(user.id, workspaceId, accountId);
  }
}
