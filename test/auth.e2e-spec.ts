import { createHash, randomUUID } from 'node:crypto';

import { INestApplication } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { App } from 'supertest/types';
import { DataSource } from 'typeorm';

import { EXPOSE_RESET_TOKEN } from './../src/api/auth/expose-reset-token';
import { AppModule } from './../src/app.module';

interface ProblemBody {
  type: string;
  title: string;
  status: number;
  detail: string;
  instance: string;
  errors?: { field: string; message: string }[];
}

interface UserBody {
  id: string;
  email: string;
  createdAt: string;
}

interface LoginBody {
  accessToken: string;
  tokenType: string;
  expiresIn: number;
}

interface ResetRequestBody {
  message: string;
  resetToken?: string;
}

const PROBLEM = /^application\/problem\+json/;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;
const REQUEST_MESSAGE = 'If the email exists, a reset link was sent';
const suffix = `${Date.now()}-${Math.floor(Math.random() * 1000)}`;
const PASSWORD = 'password123';

const sha256 = (value: string) =>
  createHash('sha256').update(value).digest('hex');

/**
 * Contra el Postgres real del compose (migrado). El rate limit es en memoria
 * y por instancia de la app (5/min por IP en login y reset): cada grupo que lo
 * consume arranca su propia app para no depender del orden de los tests.
 */
describe('/auth (e2e)', () => {
  const apps: INestApplication<App>[] = [];
  const emails: string[] = [];
  let dataSource: DataSource;

  const uniqueEmail = (label: string) => {
    const email = `${label}-${suffix}@test.com`;
    emails.push(email);
    return email;
  };

  async function boot(
    configure?: (builder: ReturnType<typeof Test.createTestingModule>) => void,
  ) {
    const builder = Test.createTestingModule({ imports: [AppModule] });
    configure?.(builder);
    const moduleRef = await builder.compile();
    const app = moduleRef.createNestApplication<INestApplication<App>>();
    await app.init();
    apps.push(app);
    dataSource = app.get(DataSource);
    return app;
  }

  const api = (app: INestApplication<App>) => ({
    register: (body: object) =>
      request(app.getHttpServer()).post('/auth/register').send(body),
    login: (body: object) =>
      request(app.getHttpServer()).post('/auth/login').send(body),
    me: (token?: string) => {
      const req = request(app.getHttpServer()).get('/auth/me');
      return token ? req.set('Authorization', `Bearer ${token}`) : req;
    },
    resetRequest: (body: object) =>
      request(app.getHttpServer())
        .post('/auth/password-reset/request')
        .send(body),
    resetConfirm: (body: object) =>
      request(app.getHttpServer())
        .post('/auth/password-reset/confirm')
        .send(body),
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
      type: `https://errors.local/${slug}`,
      status,
      title: expect.any(String) as string,
      detail: expect.any(String) as string,
      instance: expect.any(String) as string,
    });
    if (instance) expect(body.instance).toBe(instance);
    return body;
  }

  afterAll(async () => {
    // ON DELETE CASCADE se lleva los tokens de reseteo.
    if (dataSource?.isInitialized) {
      await dataSource.query(`DELETE FROM "users" WHERE email = ANY($1)`, [
        emails,
      ]);
    }
    for (const app of apps) await app.close();
  });

  describe('POST /auth/register', () => {
    let a: ReturnType<typeof api>;

    beforeAll(async () => {
      a = api(await boot());
    });

    it('201 con id, email normalizado y createdAt; sin hash', async () => {
      const email = uniqueEmail('Register');
      const res = await a.register({
        email: email.toUpperCase().replace('@TEST.COM', '@Test.com'),
        password: PASSWORD,
      });

      expect(res.status).toBe(201);
      const body = res.body as UserBody;
      expect(Object.keys(body).sort()).toEqual(['createdAt', 'email', 'id']);
      expect(body.id).toMatch(UUID);
      expect(body.email).toBe(email.toLowerCase());
      expect(new Date(body.createdAt).toISOString()).toBe(body.createdAt);

      const rows = await dataSource.query<{ password_hash: string }[]>(
        `SELECT password_hash FROM users WHERE id = $1`,
        [body.id],
      );
      expect(rows[0].password_hash).not.toBe(PASSWORD);
      expect(rows[0].password_hash).toMatch(/^\$2[aby]\$10\$/);
    });

    it('email repetido (aunque cambie el casing) -> 409 problem+json', async () => {
      const email = uniqueEmail('dup');
      await a.register({ email, password: PASSWORD }).expect(201);

      const res = await a.register({
        email: email.toUpperCase(),
        password: PASSWORD,
      });
      const problem = expectProblem(
        res,
        409,
        'email-already-registered',
        '/auth/register',
      );
      expect(problem.detail).toBe('Email already registered');
    });

    it('registros concurrentes del mismo email: uno 201 y otro 409', async () => {
      const email = uniqueEmail('race');
      const results = await Promise.all([
        a.register({ email, password: PASSWORD }),
        a.register({ email, password: PASSWORD }),
      ]);
      expect(results.map((r) => r.status).sort()).toEqual([201, 409]);
    });

    it.each([
      ['email inválido', { email: 'no-es-email', password: PASSWORD }, 'email'],
      [
        'password corto',
        { email: 'a@test.com', password: 'corta' },
        'password',
      ],
      [
        'password largo',
        { email: 'a@test.com', password: 'x'.repeat(129) },
        'password',
      ],
      ['sin password', { email: 'a@test.com' }, 'password'],
      [
        'propiedad desconocida',
        { email: 'a@test.com', password: PASSWORD, role: 'admin' },
        'role',
      ],
    ])('%s -> 400 validation-error con errors[].field', async (_n, body, f) => {
      const res = await a.register(body);
      const problem = expectProblem(res, 400, 'validation-error');
      expect(problem.errors?.map((e) => e.field)).toContain(f);
    });

    it('acepta una contraseña de 128 caracteres y permite iniciar sesión', async () => {
      const email = uniqueEmail('long');
      const password = 'p'.repeat(100) + 'é'.repeat(28);
      await a.register({ email, password }).expect(201);

      const ok = await a.login({ email, password });
      expect(ok.status).toBe(200);
      // Difiere solo después del byte 72.
      const bad = await a.login({
        email,
        password: 'p'.repeat(100) + 'é'.repeat(27) + 'e',
      });
      expectProblem(bad, 401, 'unauthorized');
    });
  });

  describe('POST /auth/login', () => {
    let a: ReturnType<typeof api>;
    const email = uniqueEmail('login');

    beforeAll(async () => {
      a = api(await boot());
      await a.register({ email, password: PASSWORD }).expect(201);
    });

    it('200 con accessToken, tokenType Bearer y expiresIn numérico', async () => {
      const res = await a.login({
        email: email.toUpperCase(),
        password: PASSWORD,
      });
      expect(res.status).toBe(200);
      const body = res.body as LoginBody;
      expect(Object.keys(body).sort()).toEqual([
        'accessToken',
        'expiresIn',
        'tokenType',
      ]);
      expect(body.tokenType).toBe('Bearer');
      expect(body.expiresIn).toBe(3600);
      expect(body.accessToken.split('.')).toHaveLength(3);
    });

    it('contraseña incorrecta y email inexistente -> 401 idéntico', async () => {
      const wrong = await a.login({ email, password: 'incorrecta' });
      const unknown = await a.login({
        email: `nadie-${suffix}@test.com`,
        password: 'incorrecta',
      });
      const p1 = expectProblem(wrong, 401, 'unauthorized', '/auth/login');
      const p2 = expectProblem(unknown, 401, 'unauthorized', '/auth/login');
      expect(p1.detail).toBe('Invalid credentials');
      expect(p2).toEqual(p1);
    });

    it('body inválido -> 400 validation-error', async () => {
      const res = await a.login({ email: 'no-es-email', password: '' });
      const problem = expectProblem(res, 400, 'validation-error');
      expect(new Set(problem.errors?.map((e) => e.field))).toEqual(
        new Set(['email', 'password']),
      );
    });
  });

  describe('rate limit', () => {
    it('login: el intento 6 en un minuto -> 429 problem+json', async () => {
      const a = api(await boot());
      const statuses: number[] = [];
      let last!: request.Response;
      for (let i = 0; i < 6; i++) {
        last = await a.login({ email: 'x@test.com', password: 'incorrecta' });
        statuses.push(last.status);
      }
      expect(statuses).toEqual([401, 401, 401, 401, 401, 429]);
      expectProblem(last, 429, 'too-many-requests', '/auth/login');
    });

    it('password-reset/request: el intento 6 -> 429; register no tiene límite propio', async () => {
      const a = api(await boot());
      const statuses: number[] = [];
      let last!: request.Response;
      for (let i = 0; i < 6; i++) {
        last = await a.resetRequest({ email: 'x@test.com' });
        statuses.push(last.status);
      }
      expect(statuses).toEqual([202, 202, 202, 202, 202, 429]);
      expectProblem(
        last,
        429,
        'too-many-requests',
        '/auth/password-reset/request',
      );

      // El contador es por endpoint: login sigue libre.
      const login = await a.login({
        email: 'x@test.com',
        password: 'incorrecta',
      });
      expect(login.status).toBe(401);
    });
  });

  describe('GET /auth/me', () => {
    let app: INestApplication<App>;
    let a: ReturnType<typeof api>;
    let jwt: JwtService;
    const email = uniqueEmail('me');
    let userId: string;
    let token: string;

    beforeAll(async () => {
      app = await boot();
      a = api(app);
      jwt = app.get(JwtService);
      userId = (
        (await a.register({ email, password: PASSWORD })).body as UserBody
      ).id;
      token = ((await a.login({ email, password: PASSWORD })).body as LoginBody)
        .accessToken;
    });

    it('200 con id, email y createdAt', async () => {
      const res = await a.me(token);
      expect(res.status).toBe(200);
      const body = res.body as UserBody;
      expect(Object.keys(body).sort()).toEqual(['createdAt', 'email', 'id']);
      expect(body).toMatchObject({ id: userId, email });
    });

    it('el JWT lleva sub y type access, sin email', () => {
      const payload = jwt.decode<Record<string, unknown>>(token);
      expect(payload).toMatchObject({ sub: userId, type: 'access' });
      expect(payload).not.toHaveProperty('email');
      expect(payload).toHaveProperty('iat');
      expect(payload).toHaveProperty('exp');
    });

    it('sin token -> 401 problem+json', async () => {
      expectProblem(await a.me(), 401, 'unauthorized', '/auth/me');
    });

    it('token manipulado -> 401', async () => {
      const [h, p, s] = token.split('.');
      const flipped = s.startsWith('A') ? `B${s.slice(1)}` : `A${s.slice(1)}`;
      expectProblem(await a.me(`${h}.${p}.${flipped}`), 401, 'unauthorized');
      expectProblem(await a.me('no-es-un-jwt'), 401, 'unauthorized');
    });

    it('token firmado con otro secreto -> 401', async () => {
      const forged = await new JwtService({ secret: 'otro' }).signAsync({
        sub: userId,
        type: 'access',
      });
      expectProblem(await a.me(forged), 401, 'unauthorized');
    });

    it('token vencido, de otro type o con sub que no es UUID -> 401', async () => {
      const expired = await jwt.signAsync(
        { sub: userId, type: 'access' },
        { expiresIn: -10 },
      );
      const refresh = await jwt.signAsync(
        { sub: userId, type: 'refresh' },
        { expiresIn: 60 },
      );
      const noType = await jwt.signAsync({ sub: userId }, { expiresIn: 60 });
      const badSub = await jwt.signAsync(
        { sub: 'no-uuid', type: 'access' },
        { expiresIn: 60 },
      );
      for (const bad of [expired, refresh, noType, badSub]) {
        expectProblem(await a.me(bad), 401, 'unauthorized');
      }
    });

    it('token válido de un usuario que ya no existe -> 401 Invalid token', async () => {
      const ghost = await jwt.signAsync(
        { sub: randomUUID(), type: 'access' },
        { expiresIn: 60 },
      );
      const problem = expectProblem(await a.me(ghost), 401, 'unauthorized');
      expect(problem.detail).toBe('Invalid token');
    });
  });

  // Cada grupo arranca su app: reset/request admite 5 por minuto.
  describe('reseteo de contraseña: request', () => {
    let a: ReturnType<typeof api>;
    const email = uniqueEmail('reset-request');

    beforeAll(async () => {
      a = api(await boot());
      await a.register({ email, password: PASSWORD }).expect(201);
    });

    it('request: 202 con message y resetToken (no production); se guarda solo el hash', async () => {
      const res = await a.resetRequest({ email: email.toUpperCase() });
      expect(res.status).toBe(202);
      const body = res.body as ResetRequestBody;
      expect(body.message).toBe(REQUEST_MESSAGE);
      expect(body.resetToken).toMatch(/^[0-9a-f]{64}$/);

      const rows = await dataSource.query<{ token_hash: string }[]>(
        `SELECT t.token_hash FROM password_reset_tokens t
         JOIN users u ON u.id = t.user_id WHERE u.email = $1`,
        [email],
      );
      const hashes = rows.map((r) => r.token_hash);
      expect(hashes).toContain(sha256(body.resetToken!));
      expect(hashes).not.toContain(body.resetToken);
    });

    it('request con email inexistente: mismo status y message, sin resetToken', async () => {
      const res = await a.resetRequest({ email: `nadie-${suffix}@test.com` });
      expect(res.status).toBe(202);
      expect(res.body).toEqual({ message: REQUEST_MESSAGE });
    });

    it('request con email inválido o propiedad extra -> 400', async () => {
      expectProblem(
        await a.resetRequest({ email: 'no-es-email' }),
        400,
        'validation-error',
      );
    });

    it('en producción (EXPOSE_RESET_TOKEN=false) nunca incluye resetToken', async () => {
      const prod = api(
        await boot((builder) =>
          builder.overrideProvider(EXPOSE_RESET_TOKEN).useValue(false),
        ),
      );
      const res = await prod.resetRequest({ email });
      expect(res.status).toBe(202);
      expect(res.body).toEqual({ message: REQUEST_MESSAGE });
    });
  });

  describe('reseteo de contraseña: confirm', () => {
    let a: ReturnType<typeof api>;
    const email = uniqueEmail('reset-confirm');
    const NEW_PASSWORD = 'nueva-password-456';

    beforeAll(async () => {
      a = api(await boot());
      await a.register({ email, password: PASSWORD }).expect(201);
    });

    async function requestToken(): Promise<string> {
      const res = await a.resetRequest({ email });
      expect(res.status).toBe(202);
      const token = (res.body as ResetRequestBody).resetToken;
      expect(token).toEqual(expect.any(String));
      return token as string;
    }

    it('confirm: 200, la contraseña nueva funciona, la vieja no y el token no se reutiliza', async () => {
      const token = await requestToken();

      const ok = await a.resetConfirm({ token, newPassword: NEW_PASSWORD });
      expect(ok.status).toBe(200);
      expect(ok.body).toEqual({ message: 'Password updated' });

      const withNew = await a.login({ email, password: NEW_PASSWORD });
      expect(withNew.status).toBe(200);
      const withOld = await a.login({ email, password: PASSWORD });
      expectProblem(withOld, 401, 'unauthorized');

      const again = await a.resetConfirm({
        token,
        newPassword: 'otra-password-789',
      });
      const problem = expectProblem(
        again,
        400,
        'invalid-reset-token',
        '/auth/password-reset/confirm',
      );
      expect(problem.detail).toBe('Invalid, expired or already used token');
      // La contraseña no cambió con el segundo intento.
      const stillNew = await a.login({ email, password: NEW_PASSWORD });
      expect(stillNew.status).toBe(200);
    });

    it('dos confirmaciones concurrentes del mismo token: una 200 y otra 400', async () => {
      const token = await requestToken();
      const results = await Promise.all([
        a.resetConfirm({ token, newPassword: 'concurrente-111' }),
        a.resetConfirm({ token, newPassword: 'concurrente-222' }),
      ]);
      expect(results.map((r) => r.status).sort()).toEqual([200, 400]);
      const loser = results.find((r) => r.status === 400)!;
      expectProblem(loser, 400, 'invalid-reset-token');
    });

    it('confirm con token inexistente -> 400 invalid-reset-token', async () => {
      const res = await a.resetConfirm({
        token: 'no-existe',
        newPassword: NEW_PASSWORD,
      });
      expectProblem(res, 400, 'invalid-reset-token');
    });

    it('confirm con token vencido -> 400 invalid-reset-token', async () => {
      const token = await requestToken();
      await dataSource.query(
        `UPDATE password_reset_tokens SET expires_at = now() - interval '1 minute'
         WHERE token_hash = $1`,
        [sha256(token)],
      );
      const res = await a.resetConfirm({ token, newPassword: 'vencido-12345' });
      expectProblem(res, 400, 'invalid-reset-token');
    });

    it('confirm con body inválido -> 400 validation-error', async () => {
      const res = await a.resetConfirm({ token: '', newPassword: 'corta' });
      const problem = expectProblem(res, 400, 'validation-error');
      expect(new Set(problem.errors?.map((e) => e.field))).toEqual(
        new Set(['token', 'newPassword']),
      );
    });
  });
});
