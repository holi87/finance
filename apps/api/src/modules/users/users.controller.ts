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

import { createUserSchema, updateUserSchema } from '@finance/shared-validation';
import type {
  CreateUserRequest,
  UpdateUserRequest,
} from '@finance/shared-types';

import { CurrentUser } from '../../common/auth/current-user.decorator';
import { JwtAuthGuard } from '../../common/auth/jwt-auth.guard';
import type { RequestUser } from '../../common/auth/request-user.interface';
import { ZodValidationPipe } from '../../common/http/zod-validation.pipe';
import { UsersService } from './users.service';

@Controller('users')
@UseGuards(JwtAuthGuard)
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get('me')
  getMe(@CurrentUser() user: RequestUser) {
    return this.usersService.getMe(user.id);
  }

  @Get()
  list(@CurrentUser() user: RequestUser) {
    return this.usersService.list(user.id);
  }

  @Post()
  create(
    @CurrentUser() user: RequestUser,
    @Body(new ZodValidationPipe(createUserSchema)) body: CreateUserRequest,
  ) {
    return this.usersService.create(user.id, body);
  }

  @Patch(':userId')
  update(
    @CurrentUser() user: RequestUser,
    @Param('userId') userId: string,
    @Body(new ZodValidationPipe(updateUserSchema)) body: UpdateUserRequest,
  ) {
    return this.usersService.update(user.id, userId, body);
  }

  @Delete(':userId')
  remove(@CurrentUser() user: RequestUser, @Param('userId') userId: string) {
    return this.usersService.remove(user.id, userId);
  }
}
