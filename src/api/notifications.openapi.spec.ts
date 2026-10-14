/* eslint-disable @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-argument -- inspecciona JSON de OpenAPI sin tipar */
import { Test } from '@nestjs/testing';
import { DocumentBuilder, OpenAPIObject, SwaggerModule } from '@nestjs/swagger';

import {
  CREATE_NOTIFICATION,
  DELETE_NOTIFICATION,
  GET_MY_NOTIFICATION,
  LIST_MY_NOTIFICATIONS,
  REVISE_NOTIFICATION,
} from '../application/tokens';
import { JwtAuthGuard } from '../auth/user/jwt-auth.guard';
import { NotificationsController } from './notifications.controller';

/** El documento que publica Swagger debe coincidir con contract/openapi.yaml. */
describe('OpenAPI de /notifications', () => {
  let doc: OpenAPIObject;

  type Json = Record<string, any>;
  const schemas = () => (doc.components?.schemas ?? {}) as Json;
  const op = (path: string, method: string): Json =>
    (doc.paths[path] as Json)[method] as Json;
  const resolve = (s: Json): Json => {
    const ref = s.$ref as string | undefined;
    return ref ? (schemas()[ref.split('/').pop()!] as Json) : s;
  };
  const refName = (s: Json) => (s.$ref as string).split('/').pop();
  const problemRef = (path: string, method: string, status: string) => {
    const content = op(path, method).responses[status]?.content as Json;
    expect(Object.keys(content ?? {})).toEqual(['application/problem+json']);
    return refName(content['application/problem+json'].schema as Json);
  };

  beforeAll(async () => {
    const stub = { execute: jest.fn() };
    const moduleRef = await Test.createTestingModule({
      controllers: [NotificationsController],
      providers: [
        CREATE_NOTIFICATION,
        LIST_MY_NOTIFICATIONS,
        GET_MY_NOTIFICATION,
        REVISE_NOTIFICATION,
        DELETE_NOTIFICATION,
      ].map((provide) => ({ provide, useValue: stub })),
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

  it('publica los schemas del contrato', () => {
    expect(Object.keys(schemas())).toEqual(
      expect.arrayContaining([
        'Notification',
        'NotificationPage',
        'ChannelPayload',
        'Problem',
        'CreateNotificationRequest',
        'ReviseNotificationRequest',
      ]),
    );
    expect(schemas().Problem.required).toEqual(['type', 'title', 'status']);
    expect(Object.keys(schemas().Problem.properties)).toEqual(
      expect.arrayContaining(['detail', 'instance', 'errors']),
    );
    const item = resolve(schemas().Problem.properties.errors.items as Json);
    expect(item.required).toEqual(['field', 'message']);
    expect(Object.keys(item.properties)).toEqual(['field', 'message']);
    expect(schemas().Notification.properties.id.format).toBe('uuid');
    expect(schemas().Notification.properties.attempts.type).toBe('integer');
    expect(schemas().Notification.properties.channel.enum).toBeUndefined();
    expect(schemas().Notification.properties.channel.description).toMatch(
      /email, sms, push/,
    );
  });

  it('declara éxito y errores por ruta, con problem+json', () => {
    const expected: [string, string, string[]][] = [
      ['/notifications', 'post', ['201', '400', '401']],
      ['/notifications', 'get', ['200', '400', '401']],
      ['/notifications/{id}', 'get', ['200', '401', '404']],
      ['/notifications/{id}', 'patch', ['200', '400', '401', '404', '409']],
      ['/notifications/{id}', 'delete', ['204', '401', '404']],
    ];
    for (const [path, method, codes] of expected) {
      const responses = op(path, method).responses as Json;
      expect(Object.keys(responses).sort()).toEqual(codes);
      for (const code of codes.filter((c) => Number(c) >= 400)) {
        expect(problemRef(path, method, code)).toBe('Problem');
      }
    }
  });

  it('referencia el schema de éxito correcto y deja 204 sin content', () => {
    const ok = (path: string, method: string, status: string) =>
      refName(
        op(path, method).responses[status].content['application/json']
          .schema as Json,
      );
    expect(ok('/notifications', 'post', '201')).toBe('Notification');
    expect(ok('/notifications', 'get', '200')).toBe('NotificationPage');
    expect(ok('/notifications/{id}', 'get', '200')).toBe('Notification');
    expect(ok('/notifications/{id}', 'patch', '200')).toBe('Notification');
    expect(op('/notifications/{id}', 'delete').responses['204'].content).toBe(
      undefined,
    );
  });

  it('page y limit son integer; el id del path es uuid', () => {
    const params = op('/notifications', 'get').parameters as Json[];
    const byName = (n: string) => params.find((p) => p.name === n)!;
    expect(byName('page').schema).toMatchObject({
      type: 'integer',
      minimum: 1,
    });
    expect(byName('limit').schema).toMatchObject({
      type: 'integer',
      minimum: 1,
      maximum: 100,
    });
    for (const method of ['get', 'patch', 'delete']) {
      const id = (op('/notifications/{id}', method).parameters as Json[]).find(
        (p) => p.name === 'id',
      )!;
      expect(id.in).toBe('path');
      expect(id.schema).toMatchObject({ type: 'string', format: 'uuid' });
    }
    const page = schemas().NotificationPage.properties;
    expect(page.page.type).toBe('integer');
    expect(page.limit.type).toBe('integer');
  });

  it('los requests son estrictos y con minLength', () => {
    const create = schemas().CreateNotificationRequest;
    expect(create.additionalProperties).toBe(false);
    expect(create.required).toEqual(
      expect.arrayContaining(['title', 'content', 'channel', 'payload']),
    );
    expect(create.properties.title).toMatchObject({
      minLength: 1,
      maxLength: 255,
    });
    expect(create.properties.content.minLength).toBe(1);
    expect(refName(create.properties.payload as Json)).toBe('ChannelPayload');

    const revise = schemas().ReviseNotificationRequest;
    expect(revise.additionalProperties).toBe(false);
    expect(revise.minProperties).toBe(1);
    expect(revise.required).toBeUndefined();
    expect(revise.properties.channel).toBeUndefined();

    const payload = resolve({ $ref: '#/components/schemas/ChannelPayload' });
    expect(payload.additionalProperties).toBe(false);
    expect(payload.required).toEqual(['recipient']);
    expect(payload.properties.recipient.minLength).toBe(1);
  });

  it('exige bearer en todas las operaciones', () => {
    for (const [path, method] of [
      ['/notifications', 'post'],
      ['/notifications', 'get'],
      ['/notifications/{id}', 'delete'],
    ]) {
      expect(op(path, method).security).toEqual([{ bearer: [] }]);
    }
  });
});
