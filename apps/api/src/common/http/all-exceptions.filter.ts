import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import type { Response } from 'express';

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost) {
    const response = host.switchToHttp().getResponse<Response>();

    if (exception instanceof HttpException) {
      const status = exception.getStatus();
      const exceptionResponse = exception.getResponse();
      const normalized =
        typeof exceptionResponse === 'string'
          ? { code: 'HTTP_EXCEPTION', message: exceptionResponse, details: [] }
          : ({
              code:
                'code' in exceptionResponse &&
                typeof exceptionResponse.code === 'string'
                  ? exceptionResponse.code
                  : 'HTTP_EXCEPTION',
              message:
                'message' in exceptionResponse &&
                typeof exceptionResponse.message === 'string'
                  ? exceptionResponse.message
                  : exception.message,
              details:
                'details' in exceptionResponse &&
                Array.isArray(exceptionResponse.details)
                  ? exceptionResponse.details
                  : [],
            } as { code: string; message: string; details: unknown[] });

      response.status(status).json({ error: normalized });
      return;
    }

    response.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
      error: {
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Unexpected server error',
        details: [],
      },
    });
  }
}
