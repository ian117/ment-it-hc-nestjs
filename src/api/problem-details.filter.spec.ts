import {
  ArgumentsHost,
  BadRequestException,
  ConflictException,
  HttpException,
  Logger,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { ThrottlerException } from '@nestjs/throttler';

import {
  ChannelRuleViolation,
  EmailAlreadyRegistered,
  InvalidCredentials,
  InvalidEmail,
  InvalidResetToken,
  NotificationNotEditable,
  NotificationNotFound,
  UnknownChannel,
  UserNotFound,
} from '../domain/errors';
import {
  describeException,
  ProblemDetailsFilter,
} from './problem-details.filter';
import { RequestValidationError } from './request-validation';

describe('describeException', () => {
  it.each([
    [
      new NotificationNotFound('x'),
      404,
      'notification-not-found',
      'Notification not found',
    ],
    [
      new NotificationNotEditable(),
      409,
      'notification-not-editable',
      'Notification not editable',
    ],
    [new UnknownChannel('fax'), 400, 'unknown-channel', 'Unknown channel'],
    [
      new ChannelRuleViolation([
        { field: 'payload.recipient', message: 'bad' },
      ]),
      400,
      'channel-rule-violation',
      'Channel rule violation',
    ],
    [
      new RequestValidationError([{ field: 'title', message: 'x' }]),
      400,
      'validation-error',
      'Validation failed',
    ],
    [
      new EmailAlreadyRegistered(),
      409,
      'email-already-registered',
      'Email already registered',
    ],
    [new InvalidCredentials(), 401, 'unauthorized', 'Unauthorized'],
    [new UserNotFound('x'), 401, 'unauthorized', 'Unauthorized'],
    [
      new InvalidResetToken(),
      400,
      'invalid-reset-token',
      'Invalid reset token',
    ],
    [new InvalidEmail(), 400, 'validation-error', 'Validation failed'],
    [new UnauthorizedException(), 401, 'unauthorized', 'Unauthorized'],
    [new ThrottlerException(), 429, 'too-many-requests', 'Too many requests'],
    [new NotFoundException('Cannot GET /x'), 404, 'not-found', 'Not found'],
    [new ConflictException('User already exists'), 409, 'conflict', 'Conflict'],
    [new BadRequestException('nope'), 400, 'bad-request', 'Bad request'],
    [new HttpException('teapot', 418), 418, 'i-am-a-teapot', 'I am a teapot'],
    [
      new Error('boom: select * from secrets'),
      500,
      'internal-error',
      'Internal server error',
    ],
  ])('%j -> %i %s', (error, status, slug, title) => {
    expect(describeException(error)).toMatchObject({ status, slug, title });
  });

  it('el detalle de not-editable es el del diseño', () => {
    expect(describeException(new NotificationNotEditable()).detail).toBe(
      'Only failed notifications can be edited',
    );
  });

  it.each([
    [new EmailAlreadyRegistered(), 'Email already registered'],
    [new InvalidCredentials(), 'Invalid credentials'],
    [new UserNotFound('secret-id'), 'Invalid token'],
    [new InvalidResetToken(), 'Invalid, expired or already used token'],
  ])('%j tiene el detail del ADR-014', (error, detail) => {
    expect(describeException(error).detail).toBe(detail);
    expect(describeException(error).errors).toBeUndefined();
  });

  it('InvalidEmail reporta errors[email]', () => {
    expect(describeException(new InvalidEmail()).errors).toEqual([
      { field: 'email', message: 'Invalid email address' },
    ]);
  });

  it('unknown-channel incluye errors[channel]', () => {
    expect(describeException(new UnknownChannel('fax')).errors).toEqual([
      { field: 'channel', message: 'Unknown channel: fax' },
    ]);
  });

  it('channel-rule-violation usa sus violations como errors', () => {
    const violations = [{ field: 'content', message: 'too long' }];
    expect(
      describeException(new ChannelRuleViolation(violations)).errors,
    ).toEqual(violations);
  });

  it('no filtra detalles internos en 500', () => {
    expect(describeException(new Error('secret')).detail).toBe(
      'An unexpected error occurred',
    );
  });

  it('JSON malformado (body-parser) -> validation-error con field "body"', () => {
    const err = Object.assign(new SyntaxError('Unexpected token'), {
      status: 400,
    });
    expect(describeException(err)).toEqual({
      status: 400,
      slug: 'validation-error',
      title: 'Validation failed',
      detail: 'Request validation failed',
      errors: [{ field: 'body', message: 'Malformed request body' }],
    });
  });

  it('el BadRequestException de Nest por JSON inválido también -> field "body"', () => {
    const d = describeException(
      new BadRequestException('Unexpected end of JSON input'),
    );
    expect(d).toMatchObject({ slug: 'validation-error' });
    expect(d.errors).toEqual([
      { field: 'body', message: 'Malformed request body' },
    ]);
  });

  it('otros 4xx de body-parser no filtran su mensaje', () => {
    const err = Object.assign(new Error('request entity too large 9999'), {
      status: 413,
    });
    expect(describeException(err)).toMatchObject({ status: 413 });
    expect(describeException(err).detail).not.toContain('9999');
  });
});

describe('ProblemDetailsFilter', () => {
  function run(exception: unknown, originalUrl = '/notifications/abc?x=1') {
    let sent = '';
    const response = {
      status: jest.fn().mockReturnThis(),
      type: jest.fn().mockReturnThis(),
      send: jest.fn().mockImplementation((payload: string) => {
        sent = payload;
        return response;
      }),
    };
    const host = {
      switchToHttp: () => ({
        getResponse: () => response,
        getRequest: () => ({ method: 'GET', originalUrl }),
      }),
    } as unknown as ArgumentsHost;
    new ProblemDetailsFilter().catch(exception, host);
    return {
      response,
      body: JSON.parse(sent) as Record<string, unknown>,
    };
  }

  beforeEach(() => {
    jest.spyOn(Logger.prototype, 'error').mockImplementation(() => undefined);
  });
  afterEach(() => jest.restoreAllMocks());

  it('responde application/problem+json con type, title, status, detail e instance', () => {
    const { response, body } = run(new NotificationNotFound('abc'));

    expect(response.status).toHaveBeenCalledWith(404);
    expect(response.type).toHaveBeenCalledWith('application/problem+json');
    expect(body).toEqual({
      type: 'https://errors.local/notification-not-found',
      title: 'Notification not found',
      status: 404,
      detail: 'Notification not found',
      instance: '/notifications/abc',
    });
  });

  it('incluye errors solo cuando aplica', () => {
    const { body } = run(
      new RequestValidationError([
        { field: 'payload.recipient', message: 'bad' },
      ]),
    );
    expect(body.errors).toEqual([
      { field: 'payload.recipient', message: 'bad' },
    ]);
  });

  it('loguea los 500 y devuelve un detail genérico', () => {
    const logError = jest.spyOn(Logger.prototype, 'error');
    const { response, body } = run(new Error('db password leaked'));
    expect(response.status).toHaveBeenCalledWith(500);
    expect(body.detail).toBe('An unexpected error occurred');
    expect(logError).toHaveBeenCalled();
  });
});

describe('describeException 429', () => {
  it('no filtra el nombre de la clase interna en detail', () => {
    expect(describeException(new ThrottlerException()).detail).toBe(
      'Rate limit exceeded',
    );
  });
});
