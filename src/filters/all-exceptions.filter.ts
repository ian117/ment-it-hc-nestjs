import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import type { Request, Response } from 'express';
import { QueryFailedError } from 'typeorm';

interface ErrorBody {
  statusCode: number;
  message: string | string[];
  error: string;
  path: string;
  timestamp: string;
}

/**
 * Un unico shape de error para toda la API.
 *
 * Se registra con APP_FILTER (no con app.useGlobalFilters) para que tambien
 * aplique en los tests e2e, que no pasan por main.ts.
 */
/** Desde aca para arriba, el error es nuestro y no del cliente. */
const SERVER_ERROR_THRESHOLD = 500;

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger(AllExceptionsFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    const { status, message, error } = this.describe(exception);

    // Los 5xx no son culpa del cliente: se loguean con stack. Los 4xx son
    // ruido esperable y no ensucian el log.
    if (status >= SERVER_ERROR_THRESHOLD) {
      this.logger.error(
        `${request.method} ${request.url} -> ${status}`,
        exception instanceof Error ? exception.stack : String(exception),
      );
    }

    const body: ErrorBody = {
      statusCode: status,
      message,
      error,
      path: request.url,
      timestamp: new Date().toISOString(),
    };

    response.status(status).json(body);
  }

  private describe(exception: unknown): {
    status: number;
    message: string | string[];
    error: string;
  } {
    if (exception instanceof HttpException) {
      const status = exception.getStatus();
      const payload = exception.getResponse();

      if (typeof payload === 'string') {
        return { status, message: payload, error: this.reason(status) };
      }

      // ValidationPipe manda message como array; hay que conservarlo asi o el
      // cliente pierde el detalle de que campo fallo.
      const { message, error } = payload as {
        message?: string | string[];
        error?: string;
      };
      return {
        status,
        message: message ?? exception.message,
        error: error ?? this.reason(status),
      };
    }

    // 23505 = unique_violation. Sin este mapeo se escapaba como 500 con el
    // SQL del driver adentro.
    if (
      exception instanceof QueryFailedError &&
      (exception as QueryFailedError & { code?: string }).code === '23505'
    ) {
      return {
        status: HttpStatus.CONFLICT,
        message: 'Resource already exists',
        error: this.reason(HttpStatus.CONFLICT),
      };
    }

    // Cualquier otra cosa es un bug nuestro: el detalle va al log, no al cliente.
    return {
      status: HttpStatus.INTERNAL_SERVER_ERROR,
      message: 'Internal server error',
      error: this.reason(HttpStatus.INTERNAL_SERVER_ERROR),
    };
  }

  /** 400 -> "Bad Request", igual que el default de Nest. */
  private reason(status: number): string {
    const name = HttpStatus[status] as string | undefined;
    if (!name) return 'Error';

    return name
      .toLowerCase()
      .split('_')
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  }
}
