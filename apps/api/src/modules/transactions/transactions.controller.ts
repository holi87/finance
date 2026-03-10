import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';

import {
  createTransactionSchema,
  createTransferSchema,
  transactionFiltersSchema,
  updateTransactionSchema,
} from '@finance/shared-validation';
import type {
  CreateTransactionRequest,
  CreateTransferRequest,
  TransactionFilters,
  UpdateTransactionRequest,
} from '@finance/shared-types';

import { CurrentUser } from '../../common/auth/current-user.decorator';
import { JwtAuthGuard } from '../../common/auth/jwt-auth.guard';
import type { RequestUser } from '../../common/auth/request-user.interface';
import { ZodValidationPipe } from '../../common/http/zod-validation.pipe';
import { TransactionsService } from './transactions.service';

@Controller('workspaces/:workspaceId')
@UseGuards(JwtAuthGuard)
export class TransactionsController {
  constructor(private readonly transactionsService: TransactionsService) {}

  @Get('transactions')
  list(
    @CurrentUser() user: RequestUser,
    @Param('workspaceId') workspaceId: string,
    @Query(new ZodValidationPipe(transactionFiltersSchema))
    query: TransactionFilters,
  ) {
    return this.transactionsService.list(user.id, workspaceId, query);
  }

  @Post('transactions')
  create(
    @CurrentUser() user: RequestUser,
    @Param('workspaceId') workspaceId: string,
    @Body(new ZodValidationPipe(createTransactionSchema))
    body: CreateTransactionRequest,
  ) {
    return this.transactionsService.create(user.id, workspaceId, body);
  }

  @Get('transactions/:transactionId')
  getDetail(
    @CurrentUser() user: RequestUser,
    @Param('workspaceId') workspaceId: string,
    @Param('transactionId') transactionId: string,
  ) {
    return this.transactionsService.getDetail(
      user.id,
      workspaceId,
      transactionId,
    );
  }

  @Patch('transactions/:transactionId')
  update(
    @CurrentUser() user: RequestUser,
    @Param('workspaceId') workspaceId: string,
    @Param('transactionId') transactionId: string,
    @Body(new ZodValidationPipe(updateTransactionSchema))
    body: UpdateTransactionRequest,
  ) {
    return this.transactionsService.update(
      user.id,
      workspaceId,
      transactionId,
      body,
    );
  }

  @Delete('transactions/:transactionId')
  remove(
    @CurrentUser() user: RequestUser,
    @Param('workspaceId') workspaceId: string,
    @Param('transactionId') transactionId: string,
  ) {
    return this.transactionsService.remove(user.id, workspaceId, transactionId);
  }

  @Post('transfers')
  createTransfer(
    @CurrentUser() user: RequestUser,
    @Param('workspaceId') workspaceId: string,
    @Body(new ZodValidationPipe(createTransferSchema))
    body: CreateTransferRequest,
  ) {
    return this.transactionsService.createTransfer(user.id, workspaceId, body);
  }
}
