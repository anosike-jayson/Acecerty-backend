import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { EntityNotFoundError, QueryFailedError } from 'typeorm';

/**
 * Global exception filter — produces a consistent structured error envelope,
 * maps TypeORM/DB errors to sensible HTTP codes, logs 5xx with stacks, and
 * never leaks internal error text to clients on a 500. (PRD §8 Observability.)
 */
@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger('Exception');

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let message: string | string[] = 'Internal server error';
    let error = 'InternalServerError';

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const res = exception.getResponse();
      if (typeof res === 'string') {
        message = res;
      } else if (typeof res === 'object' && res !== null) {
        const r = res as Record<string, any>;
        message = r.message ?? exception.message;
        error = r.error ?? exception.name;
      }
    } else if (exception instanceof EntityNotFoundError) {
      status = HttpStatus.NOT_FOUND;
      error = 'Not Found';
      message = 'Resource not found';
    } else if (exception instanceof QueryFailedError) {
      const mapped = this.mapDatabaseError(exception);
      status = mapped.status;
      error = mapped.error;
      message = mapped.message;
    }
    // Any other thrown value stays a generic 500 — its detail is logged below
    // but never returned to the client.

    if (status >= 500) {
      this.logger.error(
        `${request.method} ${request.url} -> ${status}`,
        (exception as Error)?.stack ?? String(exception),
      );
    }

    response.status(status).json({
      statusCode: status,
      error,
      message,
      path: request.url,
      timestamp: new Date().toISOString(),
    });
  }

  /**
   * Translates a Postgres error (via TypeORM's QueryFailedError) into a safe,
   * client-facing 4xx. The raw driver message is logged, not returned.
   */
  private mapDatabaseError(exception: QueryFailedError): {
    status: number;
    error: string;
    message: string;
  } {
    const code: string | undefined =
      (exception as any).code ?? (exception as any).driverError?.code;

    switch (code) {
      case '23505': // unique_violation
        return {
          status: HttpStatus.CONFLICT,
          error: 'Conflict',
          message: 'A record with these details already exists.',
        };
      case '23503': // foreign_key_violation
        return {
          status: HttpStatus.CONFLICT,
          error: 'Conflict',
          message: 'Operation references a related record that does not exist or is still in use.',
        };
      case '23502': // not_null_violation
        return {
          status: HttpStatus.BAD_REQUEST,
          error: 'Bad Request',
          message: 'A required field is missing.',
        };
      case '23514': // check_violation
        return {
          status: HttpStatus.BAD_REQUEST,
          error: 'Bad Request',
          message: 'A field failed a validation constraint.',
        };
      case '22001': // string_data_right_truncation (value too long)
        return {
          status: HttpStatus.BAD_REQUEST,
          error: 'Bad Request',
          message: 'One or more fields exceed the maximum allowed length.',
        };
      case '22P02': // invalid_text_representation (e.g. bad uuid/enum)
      case '22007': // invalid_datetime_format
        return {
          status: HttpStatus.BAD_REQUEST,
          error: 'Bad Request',
          message: 'One or more fields have an invalid format.',
        };
      default:
        // Unknown DB failure — treat as a server error, log detail internally.
        this.logger.error(`Unmapped DB error (code=${code}): ${exception.message}`);
        return {
          status: HttpStatus.INTERNAL_SERVER_ERROR,
          error: 'InternalServerError',
          message: 'Internal server error',
        };
    }
  }
}
