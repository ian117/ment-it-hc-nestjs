import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import { DataSource } from 'typeorm';
import { AppModule } from './../src/app.module';
import { Notification } from './../src/entities/notification.entity';
import { User } from './../src/entities/user.entity';

// supertest tipa res.body como any; estas formas evitan arrastrar ese any
// por todas las aserciones.
interface LoginBody {
  accessToken: string;
}

interface NotificationBody {
  id: string;
  content: string;
  status: string;
  sentAt: string | null;
  errorMessage: string | null;
  user?: unknown;
}

interface PageBody {
  data: NotificationBody[];
  total: number;
  page: number;
  limit: number;
}

interface ErrorBody {
  statusCode: number;
  message: string | string[];
  error: string;
}

/**
 * Happy path completo contra la DB real (la del docker-compose).
 *
 * El ValidationPipe y el exception filter llegan solos porque estan
 * registrados con APP_PIPE / APP_FILTER en AppModule, no en main.ts.
 */
describe('Notifications (e2e)', () => {
  let app: INestApplication<App>;
  let dataSource: DataSource;

  // Emails unicos por corrida: la constraint UNIQUE haria fallar la segunda.
  const suffix = `${Date.now()}-${Math.floor(Math.random() * 1000)}`;
  const owner = { email: `owner-${suffix}@test.com`, password: 'password123' };
  const other = { email: `other-${suffix}@test.com`, password: 'password123' };

  let ownerToken: string;
  let otherToken: string;
  let notificationId: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();
    dataSource = app.get(DataSource);
  });

  afterAll(async () => {
    // Las notificaciones primero: la FK es ON DELETE NO ACTION.
    const users = await dataSource
      .getRepository(User)
      .find({ where: [{ email: owner.email }, { email: other.email }] });

    for (const user of users) {
      await dataSource.getRepository(Notification).delete({ userId: user.id });
      await dataSource.getRepository(User).delete({ id: user.id });
    }

    await app.close();
  });

  describe('auth', () => {
    it('registra los dos usuarios', async () => {
      await request(app.getHttpServer())
        .post('/auth/signup')
        .send(owner)
        .expect(201);

      await request(app.getHttpServer())
        .post('/auth/signup')
        .send(other)
        .expect(201);
    });

    it('rechaza un email repetido con 409', async () => {
      const res = await request(app.getHttpServer())
        .post('/auth/signup')
        .send(owner)
        .expect(409);

      expect(res.body as ErrorBody).toMatchObject({
        statusCode: 409,
        error: 'Conflict',
      });
    });

    it('devuelve un JWT en el login', async () => {
      const ownerRes = await request(app.getHttpServer())
        .post('/auth/login')
        .send(owner)
        .expect(201);

      const otherRes = await request(app.getHttpServer())
        .post('/auth/login')
        .send(other)
        .expect(201);

      ownerToken = (ownerRes.body as LoginBody).accessToken;
      otherToken = (otherRes.body as LoginBody).accessToken;

      expect(ownerToken).toBeDefined();
      expect(otherToken).toBeDefined();
    });

    it('bloquea /notifications sin token', () => {
      return request(app.getHttpServer()).get('/notifications').expect(401);
    });
  });

  describe('POST /notifications', () => {
    it('rechaza un push sin deviceToken antes de persistir', async () => {
      const res = await request(app.getHttpServer())
        .post('/notifications')
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({ title: 'Sin token', content: 'x', channel: 'push' })
        .expect(400);

      expect((res.body as ErrorBody).message).toEqual(
        expect.arrayContaining([expect.stringContaining('deviceToken')]),
      );
    });

    it('rechaza un SMS de mas de 160 caracteres', () => {
      return request(app.getHttpServer())
        .post('/notifications')
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({
          title: 'Largo',
          content: 'x'.repeat(161),
          channel: 'sms',
          metadata: { phoneNumber: '+5491123456789' },
        })
        .expect(400);
    });

    it('crea y envia una notificacion valida', async () => {
      const res = await request(app.getHttpServer())
        .post('/notifications')
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({
          title: 'Bienvenida',
          content: 'Gracias por registrarte',
          channel: 'push',
          metadata: { deviceToken: 'fcm-e2e-token' },
        })
        .expect(201);

      const created = res.body as NotificationBody;
      expect(created).toMatchObject({ status: 'sent', errorMessage: null });
      expect(created.sentAt).not.toBeNull();
      expect(created.user).toBeUndefined(); // la relacion no viaja al cliente

      notificationId = created.id;
    });
  });

  describe('aislamiento entre usuarios', () => {
    it('lista solo las propias, paginadas y ordenadas', async () => {
      const res = await request(app.getHttpServer())
        .get('/notifications?page=1&limit=10')
        .set('Authorization', `Bearer ${ownerToken}`)
        .expect(200);

      const page = res.body as PageBody;
      expect(page).toMatchObject({ page: 1, limit: 10 });
      expect(page.data).toHaveLength(1);
      expect(page.data[0].id).toBe(notificationId);
    });

    it('el otro usuario no ve nada', async () => {
      const res = await request(app.getHttpServer())
        .get('/notifications')
        .set('Authorization', `Bearer ${otherToken}`)
        .expect(200);

      expect((res.body as PageBody).total).toBe(0);
    });

    // 404 y no 403: un 403 le confirmaria al tercero que el recurso existe.
    it('el otro usuario recibe 404 al pedir la notificacion ajena', () => {
      return request(app.getHttpServer())
        .get(`/notifications/${notificationId}`)
        .set('Authorization', `Bearer ${otherToken}`)
        .expect(404);
    });

    it('el otro usuario no puede borrarla', () => {
      return request(app.getHttpServer())
        .delete(`/notifications/${notificationId}`)
        .set('Authorization', `Bearer ${otherToken}`)
        .expect(404);
    });
  });

  describe('PATCH y DELETE', () => {
    it('actualiza el contenido propio', async () => {
      const res = await request(app.getHttpServer())
        .patch(`/notifications/${notificationId}`)
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({ content: 'Contenido editado' })
        .expect(200);

      expect((res.body as NotificationBody).content).toBe('Contenido editado');
    });

    it('no permite cambiar el canal', () => {
      return request(app.getHttpServer())
        .patch(`/notifications/${notificationId}`)
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({ channel: 'email' })
        .expect(400);
    });

    it('borra la propia y devuelve 204 sin body', async () => {
      const res = await request(app.getHttpServer())
        .delete(`/notifications/${notificationId}`)
        .set('Authorization', `Bearer ${ownerToken}`)
        .expect(204);

      expect(res.body).toEqual({});
    });
  });
});
