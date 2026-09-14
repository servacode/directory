import { ArgumentsHost, Catch, ExceptionFilter, HttpException, HttpStatus } from '@nestjs/common';
import type { Request, Response } from 'express';
import { ContractValidationError, ERROR_HTTP_STATUS, type ErrorCode } from '@health/contracts';
import { AuthDomainError } from '../modules/auth/core/auth-error.js';
import { LocationDomainError } from '../modules/locations/location-domain.error.js';
import { FacilityDomainError } from '../modules/facilities/facility-domain.error.js';

@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();
    const requestId = request.header('x-request-id') ?? 'unknown';

    if (exception instanceof ContractValidationError) {
      response.status(422).json({
        code: 'VALIDATION_ERROR',
        messageKey: 'errors.validation',
        details: { issues: exception.issues },
        requestId,
      });
      return;
    }

    if (exception instanceof FacilityDomainError) {
      const status = ERROR_HTTP_STATUS[exception.code] ?? 400;
      response.status(status).json({
        code: exception.code,
        messageKey: `errors.${exception.code.toLowerCase()}`,
        ...(exception.details ? { details: exception.details } : {}),
        requestId,
      });
      return;
    }

    if (exception instanceof LocationDomainError) {
      const status = ERROR_HTTP_STATUS[exception.code] ?? 400;
      response.status(status).json({
        code: exception.code,
        messageKey: `errors.${exception.code.toLowerCase()}`,
        requestId,
      });
      return;
    }

    if (exception instanceof AuthDomainError) {
      const status = ERROR_HTTP_STATUS[exception.code] ?? 400;
      response.status(status).json({
        code: exception.code,
        messageKey: `errors.${exception.code.toLowerCase()}`,
        requestId,
      });
      return;
    }

    if (exception instanceof HttpException) {
      const status = exception.getStatus();
      response.status(status).json({
        code: this.httpCode(status),
        messageKey: 'errors.request_failed',
        requestId,
      });
      return;
    }

    response.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
      code: 'INTERNAL_ERROR',
      messageKey: 'errors.internal',
      requestId,
    });
  }

  private httpCode(status: number): ErrorCode {
    if (status === 401) return 'UNAUTHORIZED';
    if (status === 403) return 'FORBIDDEN';
    if (status === 404) return 'NOT_FOUND';
    if (status === 429) return 'RATE_LIMIT_EXCEEDED';
    return 'REQUEST_FAILED';
  }
}
