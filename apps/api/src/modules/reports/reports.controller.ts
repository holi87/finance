import { Controller, Get, Param, Query, UseGuards } from '@nestjs/common';

import { transactionFiltersSchema } from '@finance/shared-validation';
import type { TransactionFilters } from '@finance/shared-types';

import { CurrentUser } from '../../common/auth/current-user.decorator';
import { JwtAuthGuard } from '../../common/auth/jwt-auth.guard';
import type { RequestUser } from '../../common/auth/request-user.interface';
import { ZodValidationPipe } from '../../common/http/zod-validation.pipe';
import { ReportsService } from './reports.service';

@Controller('workspaces/:workspaceId/reports')
@UseGuards(JwtAuthGuard)
export class ReportsController {
  constructor(private readonly reportsService: ReportsService) {}

  @Get('summary')
  getSummary(
    @CurrentUser() user: RequestUser,
    @Param('workspaceId') workspaceId: string,
    @Query(new ZodValidationPipe(transactionFiltersSchema))
    query: TransactionFilters,
  ) {
    return this.reportsService.getSummary(user.id, workspaceId, query);
  }

  @Get('by-category')
  getByCategory(
    @CurrentUser() user: RequestUser,
    @Param('workspaceId') workspaceId: string,
    @Query(new ZodValidationPipe(transactionFiltersSchema))
    query: TransactionFilters,
  ) {
    return this.reportsService.getByCategory(user.id, workspaceId, query);
  }
}
