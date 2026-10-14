import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { App } from 'supertest/types';
import { DataSource } from 'typeorm';

import { AppModule } from './../src/app.module';

interface ProblemBody {
  type: string;
  title: string;
  status: number;
  detail: string;
  instance: string;
  errors?: { field: string; message: string }[];
}

interface NotificationBody {
  id: string;
  title: string;
  content: string;
  channel: string;
  payload: { recipient: string };
  status: string;
  attempts: number;
  errorMessage: string | null;
  sentAt: string | null;
  createdAt: string;
  updatedAt: string;
}

interface PageBody {
  data: NotificationBody[];
  total: number;
  page: number;
  limit: number;
}

const PROBLEM = /^application\/problem\+json/;
const TYPE = (slug: string) => `https://errors.local/${slug}`;

/**
 * Contra el Postgres real del compose (migrado). Cubre HTTP + persistencia +
 * Problem Details + gateways simulados deterministas (ADR-012).
 */
describe('/notifications (e2e)', () => {
  let app: INestApplication<App>;
  let dataSource: DataSource;

  const suffix = `${Date.now()}-${Math.floor(Math.random() * 1000)}`;
  const owner = { email: `owner-${suffix}@test.com`, password: 'password123' };
  const other = { email: `other-${suffix}@test.com`, password: 'password123' };

  let ownerToken: string;
  let otherToken: string;

  const http = () => request(app.getHttpServer());
  const as = (token: string) => ({ Authorization: `Bearer ${token}` });

  const create = (token: string, body: object) =>
    http().post('/notifications').set(as(token)).send(body);

  const sms = (recipient: string, extra: object = {}) => ({
    title: 'Hola',
    content: 'Contenido',
    channel: 'sms',
    payload: { recipient },
    ...extra,
  });

  function expectProblem(
    res: request.Response,
    status: number,
    slug: string,
    instance?: string,
  ): ProblemBody {
    expect(res.status).toBe(status);
    expect(res.headers['content-type']).toMatch(PROBLEM);
    const body = res.body as ProblemBody;
    expect(body).toMatchObject({
      type: TYPE(slug),
      status,
      title: expect.any(String) as string,
      detail: expect.any(String) as string,
      instance: expect.any(String) as string,
    });
    if (instance) expect(body.instance).toBe(instance);
    return body;
  }

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();
    app = moduleRef.createNestApplication();
    await app.init();
    dataSource = app.get(DataSource);

    for (const u of [owner, other]) {
      await http().post('/auth/signup').send(u).expect(201);
    }
    const [o, t] = await Promise.all(
      [owner, other].map((u) => http().post('/auth/login').send(u)),
    );
    ownerToken = (o.body as { accessToken: string }).accessToken;
    otherToken = (t.body as { accessToken: string }).accessToken;
  });

  afterAll(async () => {
    // ON DELETE CASCADE se lleva las notificaciones.
    await dataSource.query(`DELETE FROM "user" WHERE email = ANY($1)`, [
      [owner.email, other.email],
    ]);
    await app.close();
  });

  describe('auth heredado + formato de error global', () => {
    it('obtiene un JWT con registro + login', () => {
      expect(ownerToken).toEqual(expect.any(String));
      expect(otherToken).toEqual(expect.any(String));
    });

    it('email repetido -> 409 problem+json', async () => {
      const res = await http().post('/auth/signup').send(owner);
      expectProblem(res, 409, 'conflict', '/auth/signup');
    });

    it('sin token -> 401 problem+json', async () => {
      const res = await http().get('/notifications?page=1');
      expectProblem(res, 401, 'unauthorized', '/notifications');
    });

    it('token inválido -> 401 problem+json', async () => {
      const res = await http().get('/notifications').set(as('no-es-un-jwt'));
      expectProblem(res, 401, 'unauthorized');
    });

    it('ruta inexistente -> 404 not-found', async () => {
      const res = await http().get('/no-existe');
      expectProblem(res, 404, 'not-found', '/no-existe');
    });

    it('JSON malformado -> 400 problem+json', async () => {
      const res = await http()
        .post('/notifications')
        .set(as(ownerToken))
        .set('Content-Type', 'application/json')
        .send('{"title": ');
      const problem = expectProblem(res, 400, 'validation-error');
      expect(problem.errors?.[0].field).toBe('body');
    });
  });

  describe('POST /notifications', () => {
    it('201 sent cuando la entrega funciona', async () => {
      const res = await create(ownerToken, sms('+5219611234567'));

      expect(res.status).toBe(201);
      expect(res.headers['content-type']).toMatch(/application\/json/);
      const n = res.body as NotificationBody;
      expect(n).toEqual({
        id: expect.any(String) as string,
        title: 'Hola',
        content: 'Contenido',
        channel: 'sms',
        payload: { recipient: '+5219611234567' },
        status: 'sent',
        attempts: 1,
        errorMessage: null,
        sentAt: expect.stringMatching(/Z$/) as string,
        createdAt: expect.stringMatching(/Z$/) as string,
        updatedAt: expect.stringMatching(/Z$/) as string,
      });
    });

    it('201 failed cuando el gateway simulado falla (email con "fail")', async () => {
      const res = await create(ownerToken, {
        title: 'Hola',
        content: 'x',
        channel: 'email',
        payload: { recipient: 'will-FAIL@test.com' },
      });

      expect(res.status).toBe(201);
      expect(res.body).toMatchObject({
        status: 'failed',
        attempts: 1,
        errorMessage: 'Simulated delivery failure',
        sentAt: null,
      });
    });

    it('201 failed para push con "fail" y para sms terminado en 0000', async () => {
      const push = await create(ownerToken, {
        title: 'p',
        content: 'x',
        channel: 'push',
        payload: { recipient: 'tok-fail-1' },
      });
      const smsRes = await create(ownerToken, sms('+5219610000000'));
      expect((push.body as NotificationBody).status).toBe('failed');
      expect((smsRes.body as NotificationBody).status).toBe('failed');
    });

    it('400 channel-rule-violation: SMS > 160 y no escribe en la base', async () => {
      const [{ count: before }] = await dataSource.query<{ count: string }[]>(
        `SELECT count(*) FROM notifications`,
      );

      const res = await create(
        ownerToken,
        sms('+5219611234567', { content: 'x'.repeat(161) }),
      );

      const problem = expectProblem(
        res,
        400,
        'channel-rule-violation',
        '/notifications',
      );
      expect(problem.errors).toEqual([
        { field: 'content', message: expect.any(String) as string },
      ]);
      const [{ count: after }] = await dataSource.query<{ count: string }[]>(
        `SELECT count(*) FROM notifications`,
      );
      expect(after).toBe(before);
    });

    it('400 channel-rule-violation por destinatario inválido', async () => {
      const res = await create(ownerToken, sms('no-es-un-telefono'));
      const problem = expectProblem(res, 400, 'channel-rule-violation');
      expect(problem.errors?.[0].field).toBe('payload.recipient');
    });

    it('400 unknown-channel con errors[channel]', async () => {
      const res = await create(
        ownerToken,
        sms('+5219611234567', { channel: 'fax' }),
      );
      const problem = expectProblem(res, 400, 'unknown-channel');
      expect(problem.errors?.[0].field).toBe('channel');
    });

    it('400 validation-error con campos en notación de puntos', async () => {
      const res = await create(ownerToken, {
        title: '',
        content: 'x',
        channel: 'sms',
        payload: {},
      });
      const problem = expectProblem(
        res,
        400,
        'validation-error',
        '/notifications',
      );
      expect(problem.errors?.map((e) => e.field)).toEqual(
        expect.arrayContaining(['title', 'payload.recipient']),
      );
    });

    it('400 validation-error con propiedades desconocidas (metadata)', async () => {
      const res = await create(
        ownerToken,
        sms('+5219611234567', { metadata: {} }),
      );
      const problem = expectProblem(res, 400, 'validation-error');
      expect(problem.errors?.map((e) => e.field)).toContain('metadata');
    });
  });

  describe('GET /notifications', () => {
    const ids: string[] = [];

    beforeAll(async () => {
      for (let i = 0; i < 3; i++) {
        const res = await create(
          otherToken,
          sms('+5219611234567', { title: `n${i}` }),
        );
        ids.push((res.body as NotificationBody).id);
      }
    });

    it('lista paginada: más nuevas primero, total y límite', async () => {
      const res = await http()
        .get('/notifications?page=1&limit=2')
        .set(as(otherToken))
        .expect(200);
      const page = res.body as PageBody;

      expect(page).toMatchObject({ total: 3, page: 1, limit: 2 });
      expect(page.data.map((n) => n.title)).toEqual(['n2', 'n1']);

      const second = await http()
        .get('/notifications?page=2&limit=2')
        .set(as(otherToken))
        .expect(200);
      expect((second.body as PageBody).data.map((n) => n.title)).toEqual([
        'n0',
      ]);
    });

    it('defaults page=1 limit=20 y solo las propias', async () => {
      const res = await http()
        .get('/notifications')
        .set(as(otherToken))
        .expect(200);
      expect(res.body).toMatchObject({ total: 3, page: 1, limit: 20 });
    });

    it.each(['limit=101', 'limit=0', 'page=0', 'page=abc'])(
      '400 validation-error con %s',
      async (qs) => {
        const res = await http()
          .get(`/notifications?${qs}`)
          .set(as(otherToken));
        const problem = expectProblem(res, 400, 'validation-error');
        expect(problem.errors?.[0].field).toBe(qs.split('=')[0]);
      },
    );

    it('GET por id devuelve la notificación propia', async () => {
      const res = await http()
        .get(`/notifications/${ids[0]}`)
        .set(as(otherToken))
        .expect(200);
      expect((res.body as NotificationBody).id).toBe(ids[0]);
    });

    it('GET ajeno -> 404 notification-not-found', async () => {
      const res = await http()
        .get(`/notifications/${ids[0]}`)
        .set(as(ownerToken));
      expectProblem(
        res,
        404,
        'notification-not-found',
        `/notifications/${ids[0]}`,
      );
    });

    it('id inexistente o con formato inválido -> 404', async () => {
      const missing = await http()
        .get('/notifications/00000000-0000-4000-8000-000000000000')
        .set(as(ownerToken));
      expectProblem(missing, 404, 'notification-not-found');

      const malformed = await http()
        .get('/notifications/abc')
        .set(as(ownerToken));
      expectProblem(
        malformed,
        404,
        'notification-not-found',
        '/notifications/abc',
      );
    });
  });

  describe('PATCH /notifications/:id', () => {
    const patch = (token: string, id: string, body: object) =>
      http().patch(`/notifications/${id}`).set(as(token)).send(body);

    async function createFailed(): Promise<string> {
      const res = await create(ownerToken, sms('+5219610000000'));
      expect((res.body as NotificationBody).status).toBe('failed');
      return (res.body as NotificationBody).id;
    }

    it('sent -> 409 notification-not-editable', async () => {
      const sent = await create(ownerToken, sms('+5219611234567'));
      const id = (sent.body as NotificationBody).id;

      const res = await patch(ownerToken, id, { title: 'nuevo' });

      const problem = expectProblem(res, 409, 'notification-not-editable');
      expect(problem.detail).toBe('Only failed notifications can be edited');
    });

    it('failed + destinatario válido -> 200 sent con attempts 2', async () => {
      const id = await createFailed();

      const res = await patch(ownerToken, id, {
        title: 'Corregida',
        payload: { recipient: '+5219611234567' },
      });

      expect(res.status).toBe(200);
      expect(res.body).toMatchObject({
        id,
        title: 'Corregida',
        payload: { recipient: '+5219611234567' },
        status: 'sent',
        attempts: 2,
        errorMessage: null,
        sentAt: expect.any(String) as string,
      });
      const persisted = await http()
        .get(`/notifications/${id}`)
        .set(as(ownerToken))
        .expect(200);
      expect(persisted.body).toMatchObject({ status: 'sent', attempts: 2 });
    });

    it('failed + destinatario que sigue fallando -> 200 failed con attempts 2', async () => {
      const id = await createFailed();
      const res = await patch(ownerToken, id, {
        payload: { recipient: '+5219620000000' },
      });
      expect(res.status).toBe(200);
      expect(res.body).toMatchObject({ status: 'failed', attempts: 2 });
    });

    it('failed + payload inválido -> 400 y la notificación sigue failed', async () => {
      const id = await createFailed();

      const res = await patch(ownerToken, id, { payload: { recipient: 'xx' } });

      expectProblem(res, 400, 'channel-rule-violation');
      const after = await http()
        .get(`/notifications/${id}`)
        .set(as(ownerToken))
        .expect(200);
      expect(after.body).toMatchObject({
        status: 'failed',
        attempts: 1,
        payload: { recipient: '+5219610000000' },
      });
    });

    it('body con channel -> 400 validation-error', async () => {
      const id = await createFailed();
      const res = await patch(ownerToken, id, { channel: 'email' });
      const problem = expectProblem(res, 400, 'validation-error');
      expect(problem.errors?.map((e) => e.field)).toContain('channel');
    });

    it('{} -> 400 validation-error', async () => {
      const id = await createFailed();
      const res = await patch(ownerToken, id, {});
      const problem = expectProblem(res, 400, 'validation-error');
      expect(problem.errors?.[0].field).toBe('body');
    });

    it.each(['title', 'content', 'payload'])(
      'null explícito en %s -> 400 validation-error',
      async (field) => {
        const id = await createFailed();
        const res = await patch(ownerToken, id, { [field]: null });
        const problem = expectProblem(res, 400, 'validation-error');
        expect(problem.errors?.map((e) => e.field)).toContain(field);
      },
    );

    it('ajena -> 404', async () => {
      const id = await createFailed();
      const res = await patch(otherToken, id, { title: 'x' });
      expectProblem(res, 404, 'notification-not-found');
    });
  });

  describe('rate limit', () => {
    it('login: el intento 6 en un minuto -> 429 problem+json', async () => {
      let last!: request.Response;
      for (let i = 0; i < 6; i++) {
        last = await http()
          .post('/auth/login')
          .send({ email: owner.email, password: 'incorrecta' });
      }
      expectProblem(last, 429, 'too-many-requests', '/auth/login');
    });
  });

  describe('DELETE /notifications/:id', () => {
    it('204 sin body y luego 404', async () => {
      const created = await create(ownerToken, sms('+5219611234567'));
      const id = (created.body as NotificationBody).id;

      const del = await http()
        .delete(`/notifications/${id}`)
        .set(as(ownerToken));
      expect(del.status).toBe(204);
      expect(del.text).toBe('');

      const again = await http()
        .delete(`/notifications/${id}`)
        .set(as(ownerToken));
      expectProblem(again, 404, 'notification-not-found');
      const get = await http().get(`/notifications/${id}`).set(as(ownerToken));
      expectProblem(get, 404, 'notification-not-found');
    });

    it('ajena -> 404 y sigue existiendo', async () => {
      const created = await create(ownerToken, sms('+5219611234567'));
      const id = (created.body as NotificationBody).id;

      const res = await http()
        .delete(`/notifications/${id}`)
        .set(as(otherToken));
      expectProblem(res, 404, 'notification-not-found');
      await http().get(`/notifications/${id}`).set(as(ownerToken)).expect(200);
    });

    it('un failed también se puede borrar', async () => {
      const created = await create(ownerToken, sms('+5219610000000'));
      const id = (created.body as NotificationBody).id;
      await http()
        .delete(`/notifications/${id}`)
        .set(as(ownerToken))
        .expect(204);
    });
  });
});
