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
  createCategorySchema,
  updateCategorySchema,
} from '@finance/shared-validation';
import type {
  CreateCategoryRequest,
  UpdateCategoryRequest,
} from '@finance/shared-types';

import { CurrentUser } from '../../common/auth/current-user.decorator';
import { JwtAuthGuard } from '../../common/auth/jwt-auth.guard';
import type { RequestUser } from '../../common/auth/request-user.interface';
import { ZodValidationPipe } from '../../common/http/zod-validation.pipe';
import { CategoriesService } from './categories.service';

@Controller('workspaces/:workspaceId/categories')
@UseGuards(JwtAuthGuard)
export class CategoriesController {
  constructor(private readonly categoriesService: CategoriesService) {}

  @Get()
  list(
    @CurrentUser() user: RequestUser,
    @Param('workspaceId') workspaceId: string,
  ) {
    return this.categoriesService.list(user.id, workspaceId);
  }

  @Post()
  create(
    @CurrentUser() user: RequestUser,
    @Param('workspaceId') workspaceId: string,
    @Body(new ZodValidationPipe(createCategorySchema))
    body: CreateCategoryRequest,
  ) {
    return this.categoriesService.create(user.id, workspaceId, body);
  }

  @Patch(':categoryId')
  update(
    @CurrentUser() user: RequestUser,
    @Param('workspaceId') workspaceId: string,
    @Param('categoryId') categoryId: string,
    @Body(new ZodValidationPipe(updateCategorySchema))
    body: UpdateCategoryRequest,
  ) {
    return this.categoriesService.update(
      user.id,
      workspaceId,
      categoryId,
      body,
    );
  }

  @Delete(':categoryId')
  remove(
    @CurrentUser() user: RequestUser,
    @Param('workspaceId') workspaceId: string,
    @Param('categoryId') categoryId: string,
  ) {
    return this.categoriesService.remove(user.id, workspaceId, categoryId);
  }
}
