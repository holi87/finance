import { Body, Controller, Post } from '@nestjs/common';

import { loginSchema, refreshSchema } from '@finance/shared-validation';

import { ZodValidationPipe } from '../../common/http/zod-validation.pipe';
import type { LoginRequest, RefreshRequest } from '@finance/shared-types';
import { AuthService } from './auth.service';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('login')
  login(@Body(new ZodValidationPipe(loginSchema)) body: LoginRequest) {
    return this.authService.login(body);
  }

  @Post('refresh')
  refresh(@Body(new ZodValidationPipe(refreshSchema)) body: RefreshRequest) {
    return this.authService.refresh(body.refreshToken);
  }

  @Post('logout')
  logout(@Body(new ZodValidationPipe(refreshSchema)) body: RefreshRequest) {
    return this.authService.logout(body.refreshToken);
  }
}
