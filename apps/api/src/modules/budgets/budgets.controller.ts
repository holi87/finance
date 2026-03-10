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
  createBudgetLimitSchema,
  createBudgetPeriodSchema,
  updateBudgetLimitSchema,
} from '@finance/shared-validation';
import type {
  CreateBudgetLimitRequest,
  CreateBudgetPeriodRequest,
  UpdateBudgetLimitRequest,
} from '@finance/shared-types';

import { CurrentUser } from '../../common/auth/current-user.decorator';
import { JwtAuthGuard } from '../../common/auth/jwt-auth.guard';
import type { RequestUser } from '../../common/auth/request-user.interface';
import { ZodValidationPipe } from '../../common/http/zod-validation.pipe';
import { BudgetsService } from './budgets.service';

@Controller('workspaces/:workspaceId')
@UseGuards(JwtAuthGuard)
export class BudgetsController {
  constructor(private readonly budgetsService: BudgetsService) {}

  @Get('budget-periods')
  listPeriods(
    @CurrentUser() user: RequestUser,
    @Param('workspaceId') workspaceId: string,
  ) {
    return this.budgetsService.listPeriods(user.id, workspaceId);
  }

  @Post('budget-periods')
  createPeriod(
    @CurrentUser() user: RequestUser,
    @Param('workspaceId') workspaceId: string,
    @Body(new ZodValidationPipe(createBudgetPeriodSchema))
    body: CreateBudgetPeriodRequest,
  ) {
    return this.budgetsService.createPeriod(user.id, workspaceId, body);
  }

  @Get('budget-limits')
  listLimits(
    @CurrentUser() user: RequestUser,
    @Param('workspaceId') workspaceId: string,
  ) {
    return this.budgetsService.listLimits(user.id, workspaceId);
  }

  @Post('budget-limits')
  createLimit(
    @CurrentUser() user: RequestUser,
    @Param('workspaceId') workspaceId: string,
    @Body(new ZodValidationPipe(createBudgetLimitSchema))
    body: CreateBudgetLimitRequest,
  ) {
    return this.budgetsService.createLimit(user.id, workspaceId, body);
  }

  @Patch('budget-limits/:budgetLimitId')
  updateLimit(
    @CurrentUser() user: RequestUser,
    @Param('workspaceId') workspaceId: string,
    @Param('budgetLimitId') budgetLimitId: string,
    @Body(new ZodValidationPipe(updateBudgetLimitSchema))
    body: UpdateBudgetLimitRequest,
  ) {
    return this.budgetsService.updateLimit(
      user.id,
      workspaceId,
      budgetLimitId,
      body,
    );
  }

  @Delete('budget-limits/:budgetLimitId')
  removeLimit(
    @CurrentUser() user: RequestUser,
    @Param('workspaceId') workspaceId: string,
    @Param('budgetLimitId') budgetLimitId: string,
  ) {
    return this.budgetsService.removeLimit(user.id, workspaceId, budgetLimitId);
  }
}
