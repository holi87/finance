import { createParamDecorator, ExecutionContext } from '@nestjs/common';

import type { RequestUser } from './request-user.interface';

export const CurrentUser = createParamDecorator(
  (_, context: ExecutionContext): RequestUser => {
    const request = context.switchToHttp().getRequest<{ user: RequestUser }>();
    return request.user;
  },
);
