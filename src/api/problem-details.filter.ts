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

import {
  ChannelRuleViolation,
  EmailAlreadyRegistered,
  FieldViolation,
  InvalidCredentials,
  InvalidEmail,
  InvalidResetToken,
  NotificationNotEditable,
  NotificationNotFound,
  UnknownChannel,
  UserNotFound,
} from '../domain/errors';
import { RequestValidationError } from './request-validation';

export const PROBLEM_JSON = 'application/problem+json';
const TYPE_BASE = 'https://errors.local/';

export interface Problem {
  type: string;
  title: string;
  status: number;
  detail: string;
  instance: string;
  errors?: FieldViolation[];
}

interface Described {
  status: number;
  slug: string;
  title: string;
  detail: string;
  errors?: FieldViolation[];
}

/** Slug y título genéricos por status (ADR-012). */
const GENERIC: Record<number, { slug: string; title: string }> = {
  400: { slug: 'bad-request', title: 'Bad request' },
  401: { slug: 'unauthorized', title: 'Unauthorized' },
  404: { slug: 'not-found', title: 'Not found' },
  409: { slug: 'conflict', title: 'Conflict' },
  429: { slug: 'too-many-requests', title: 'Too many requests' },
};

function generic(status: number): { slug: string; title: string } {
  const known = GENERIC[status];
  if (known) return known;
  const name = (HttpStatus[status] as string | undefined) ?? 'ERROR';
  const words = name.toLowerCase().split('_');
  return {
    slug: words.join('-'),
    title: words
      .map((w, i) => (i === 0 ? w[0].toUpperCase() + w.slice(1) : w))
      .join(' '),
  };
}

function httpDetail(exception: HttpException): string {
  const body = exception.getResponse();
  if (typeof body === 'string') return body;
  const message = (body as { message?: string | string[] }).message;
  if (Array.isArray(message)) return message.join('; ');
  return message ?? exception.message;
}

const MALFORMED_JSON = /\bJSON\b/;

/** Sin campo concreto: `field: "body"` (ADR-012). */
function malformedBody(): Described {
  return {
    status: 400,
    slug: 'validation-error',
    title: 'Validation failed',
    detail: 'Request validation failed',
    errors: [{ field: 'body', message: 'Malformed request body' }],
  };
}

/** Traduce cualquier excepción a la descripción de un Problem Details. */
export function describeException(exception: unknown): Described {
  if (exception instanceof NotificationNotFound) {
    return {
      status: 404,
      slug: 'notification-not-found',
      title: 'Notification not found',
      detail: 'Notification not found',
    };
  }
  if (exception instanceof NotificationNotEditable) {
    return {
      status: 409,
      slug: 'notification-not-editable',
      title: 'Notification not editable',
      detail: 'Only failed notifications can be edited',
    };
  }
  if (exception instanceof UnknownChannel) {
    return {
      status: 400,
      slug: 'unknown-channel',
      title: 'Unknown channel',
      detail: exception.message,
      errors: [{ field: 'channel', message: exception.message }],
    };
  }
  if (exception instanceof ChannelRuleViolation) {
    return {
      status: 400,
      slug: 'channel-rule-violation',
      title: 'Channel rule violation',
      detail: exception.message,
      errors: exception.violations,
    };
  }
  if (exception instanceof EmailAlreadyRegistered) {
    return {
      status: 409,
      slug: 'email-already-registered',
      title: 'Email already registered',
      detail: 'Email already registered',
    };
  }
  if (exception instanceof InvalidCredentials) {
    return {
      status: 401,
      ...generic(401),
      detail: 'Invalid credentials',
    };
  }
  // Token válido de un usuario que ya no existe (solo /auth/me lo consulta).
  if (exception instanceof UserNotFound) {
    return { status: 401, ...generic(401), detail: 'Invalid token' };
  }
  if (exception instanceof InvalidResetToken) {
    return {
      status: 400,
      slug: 'invalid-reset-token',
      title: 'Invalid reset token',
      detail: 'Invalid, expired or already used token',
    };
  }
  if (exception instanceof InvalidEmail) {
    return {
      status: 400,
      slug: 'validation-error',
      title: 'Validation failed',
      detail: 'Request validation failed',
      errors: [{ field: 'email', message: exception.message }],
    };
  }
  if (exception instanceof RequestValidationError) {
    return {
      status: 400,
      slug: 'validation-error',
      title: 'Validation failed',
      detail: 'Request validation failed',
      errors: exception.errors,
    };
  }
  if (exception instanceof HttpException) {
    const status = exception.getStatus();
    // Nest convierte el SyntaxError de body-parser (JSON mal formado) en un
    // BadRequestException anónimo; solo su mensaje (de V8) lo delata.
    if (status === 400 && MALFORMED_JSON.test(httpDetail(exception))) {
      return malformedBody();
    }
    return { status, ...generic(status), detail: httpDetail(exception) };
  }
  // unique_violation: sin este mapeo se escaparía como 500.
  if (
    exception instanceof QueryFailedError &&
    (exception as QueryFailedError & { code?: string }).code === '23505'
  ) {
    return { status: 409, ...generic(409), detail: 'Resource already exists' };
  }
  // Errores 4xx de body-parser (JSON malformado, payload enorme...).
  const status = (exception as { status?: unknown } | null)?.status;
  if (typeof status === 'number' && status >= 400 && status < 500) {
    if (status === 400) return malformedBody();
    return { status, ...generic(status), detail: generic(status).title };
  }
  return {
    status: 500,
    slug: 'internal-error',
    title: 'Internal server error',
    detail: 'An unexpected error occurred',
  };
}

/** Filtro global: todo error sale como RFC 9457 `application/problem+json`. */
@Catch()
export class ProblemDetailsFilter implements ExceptionFilter {
  private readonly logger = new Logger(ProblemDetailsFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    const described = describeException(exception);
    if (described.status >= 500) {
      // El detalle va al log, nunca al cliente.
      this.logger.error(
        `${request.method} ${request.originalUrl} -> ${described.status}`,
        exception instanceof Error ? exception.stack : String(exception),
      );
    }

    const problem: Problem = {
      type: `${TYPE_BASE}${described.slug}`,
      title: described.title,
      status: described.status,
      detail: described.detail,
      instance: request.originalUrl.split('?')[0],
      ...(described.errors ? { errors: described.errors } : {}),
    };

    response
      .status(described.status)
      .type(PROBLEM_JSON)
      .send(JSON.stringify(problem));
  }
}
