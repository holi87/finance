import {
  CanActivate,
  ExecutionContext,
  Injectable,
  ForbiddenException,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';

import { PrismaService } from '../../database/prisma.service';
import type { RequestUser } from './request-user.interface';

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly prisma: PrismaService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<{
      headers: { authorization?: string };
      user?: RequestUser;
    }>();

    const header = request.headers.authorization;

    if (!header?.startsWith('Bearer ')) {
      throw new UnauthorizedException({
        code: 'UNAUTHORIZED',
        message: 'Missing bearer token',
      });
    }

    const token = header.slice('Bearer '.length);

    try {
      const payload = await this.jwtService.verifyAsync<{
        sub: string;
        email: string;
        sessionId?: string;
      }>(token, {
        secret: this.configService.getOrThrow<string>('JWT_ACCESS_SECRET'),
      });

      const user = await this.prisma.user.findUnique({
        where: { id: payload.sub },
        select: {
          id: true,
          email: true,
          isActive: true,
          isSystemAdmin: true,
        },
      });

      if (!user) {
        throw new UnauthorizedException({
          code: 'UNAUTHORIZED',
          message: 'User no longer exists',
        });
      }

      if (!user.isActive) {
        throw new ForbiddenException({
          code: 'USER_DISABLED',
          message: 'User account is disabled',
        });
      }

      request.user = {
        id: user.id,
        email: user.email,
        isSystemAdmin: user.isSystemAdmin,
        sessionId: payload.sessionId,
      };

      return true;
    } catch {
      throw new UnauthorizedException({
        code: 'UNAUTHORIZED',
        message: 'Invalid access token',
      });
    }
  }
}
