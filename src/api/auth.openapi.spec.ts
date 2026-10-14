/* eslint-disable @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-argument -- inspecciona JSON de OpenAPI sin tipar */
import { Test } from '@nestjs/testing';
import { DocumentBuilder, OpenAPIObject, SwaggerModule } from '@nestjs/swagger';

import {
  CONFIRM_PASSWORD_RESET,
  GET_CURRENT_USER,
  LOGIN,
  REGISTER_USER,
  REQUEST_PASSWORD_RESET,
} from '../application/tokens';
import { AuthController } from './auth.controller';
import { EXPOSE_RESET_TOKEN } from './auth/expose-reset-token';
import { JwtAuthGuard } from './auth/jwt-auth.guard';

/** El documento que publica Swagger debe coincidir con contract/openapi.yaml. */
describe('OpenAPI de /auth', () => {
  let doc: OpenAPIObject;

  type Json = Record<string, any>;
  const schemas = () => (doc.components?.schemas ?? {}) as Json;
  const op = (path: string, method: string): Json =>
    (doc.paths[path] as Json)[method] as Json;
  const responseCodes = (path: string, method: string) =>
    Object.keys(op(path, method).responses).sort();

  beforeAll(async () => {
    const stub = { execute: jest.fn() };
    const moduleRef = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [
        ...[
          REGISTER_USER,
          LOGIN,
          GET_CURRENT_USER,
          REQUEST_PASSWORD_RESET,
          CONFIRM_PASSWORD_RESET,
        ].map((provide) => ({ provide, useValue: stub })),
        { provide: EXPOSE_RESET_TOKEN, useValue: true },
      ],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({ canActivate: () => true })
      .compile();
    const app = moduleRef.createNestApplication();
    await app.init();
    doc = SwaggerModule.createDocument(
      app,
      new DocumentBuilder().addBearerAuth().build(),
    );
    await app.close();
  });

  it('publica las rutas y los códigos del contrato', () => {
    expect(Object.keys(doc.paths).sort()).toEqual([
      '/auth/login',
      '/auth/me',
      '/auth/password-reset/confirm',
      '/auth/password-reset/request',
      '/auth/register',
    ]);
    expect(responseCodes('/auth/register', 'post')).toEqual([
      '201',
      '400',
      '409',
    ]);
    expect(responseCodes('/auth/login', 'post')).toEqual([
      '200',
      '400',
      '401',
      '429',
    ]);
    expect(responseCodes('/auth/me', 'get')).toEqual(['200', '401']);
    expect(responseCodes('/auth/password-reset/request', 'post')).toEqual([
      '202',
      '400',
      '429',
    ]);
    expect(responseCodes('/auth/password-reset/confirm', 'post')).toEqual([
      '200',
      '400',
    ]);
  });

  it('usa los operationId del contrato y exige Bearer solo en /me', () => {
    expect(op('/auth/register', 'post').operationId).toBe('registerUser');
    expect(op('/auth/login', 'post').operationId).toBe('login');
    expect(op('/auth/me', 'get').operationId).toBe('getCurrentUser');
    expect(op('/auth/password-reset/request', 'post').operationId).toBe(
      'requestPasswordReset',
    );
    expect(op('/auth/password-reset/confirm', 'post').operationId).toBe(
      'confirmPasswordReset',
    );
    expect(op('/auth/me', 'get').security).toEqual([{ bearer: [] }]);
    expect(op('/auth/login', 'post').security).toBeUndefined();
  });

  it('los schemas de request rechazan propiedades extra y fijan límites', () => {
    const s = schemas();
    for (const name of [
      'RegisterRequest',
      'LoginRequest',
      'PasswordResetRequest',
      'PasswordResetConfirm',
    ]) {
      expect(s[name].additionalProperties).toBe(false);
    }
    expect(s.RegisterRequest.properties.email.maxLength).toBe(320);
    expect(s.RegisterRequest.properties.password).toMatchObject({
      minLength: 8,
      maxLength: 128,
    });
    expect(s.PasswordResetConfirm.properties.newPassword).toMatchObject({
      minLength: 8,
      maxLength: 128,
    });
    expect(s.PasswordResetConfirm.properties.token.minLength).toBe(1);
    expect(s.LoginRequest.properties.password.minLength).toBe(1);
  });

  it('los schemas de respuesta son los del contrato', () => {
    const s = schemas();
    expect([...s.User.required].sort()).toEqual(['createdAt', 'email', 'id']);
    expect([...s.AccessToken.required].sort()).toEqual([
      'accessToken',
      'expiresIn',
      'tokenType',
    ]);
    expect(s.AccessToken.properties.expiresIn.type).toBe('integer');
    expect(s.PasswordResetRequested.required).toEqual(['message']);
    expect(Object.keys(s.PasswordResetRequested.properties).sort()).toEqual([
      'message',
      'resetToken',
    ]);
    expect(s.Message.required).toEqual(['message']);
  });

  it('los errores son application/problem+json', () => {
    const content = op('/auth/login', 'post').responses['401'].content;
    expect(Object.keys(content)).toEqual(['application/problem+json']);
  });
});
