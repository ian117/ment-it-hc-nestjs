import { NotFoundException } from '@nestjs/common';
import { DataSource, EntityManager, Repository } from 'typeorm';
import {
  Notification,
  NotificationChannelEnum,
  NotificationStatusEnum,
} from '../entities/notification.entity';
import { NotificationService } from './notification.service';
import { NotificationDispatcherService } from './senders/notification-dispatcher.service';

describe('NotificationService', () => {
  let service: NotificationService;
  let repo: jest.Mocked<
    Pick<
      Repository<Notification>,
      'findOne' | 'findAndCount' | 'save' | 'remove'
    >
  >;
  let dispatcher: jest.Mocked<
    Pick<NotificationDispatcherService, 'dispatch' | 'validateDraft'>
  >;
  let manager: jest.Mocked<
    Pick<EntityManager, 'create' | 'save' | 'findOneOrFail'>
  >;

  beforeEach(() => {
    repo = {
      findOne: jest.fn(),
      findAndCount: jest.fn(),
      save: jest.fn(),
      remove: jest.fn(),
    };

    dispatcher = {
      dispatch: jest.fn().mockResolvedValue(undefined),
      validateDraft: jest.fn().mockResolvedValue(undefined),
    };

    manager = {
      create: jest.fn((_entity, data: object) => ({ id: 'n-1', ...data })),
      save: jest.fn((entity: object) => Promise.resolve(entity)),
      findOneOrFail: jest.fn(),
    } as unknown as typeof manager;

    const dataSource = {
      transaction: (cb: (m: typeof manager) => unknown) => cb(manager),
    } as unknown as DataSource;

    service = new NotificationService(
      repo as unknown as Repository<Notification>,
      dispatcher as unknown as NotificationDispatcherService,
      dataSource,
    );
  });

  describe('create', () => {
    const dto = {
      title: 'Hola',
      content: 'Contenido',
      channel: NotificationChannelEnum.PUSH,
      metadata: { deviceToken: 'fcm-abc' },
    };

    function stubLoadedNotification(): Notification {
      // Fiel a lo que devuelve la DB: sentAt y errorMessage arrancan en null,
      // no undefined. Si no, el test de FAILED pasa por el motivo equivocado.
      const loaded = {
        id: 'n-1',
        channel: NotificationChannelEnum.PUSH,
        status: NotificationStatusEnum.PENDING,
        sentAt: null,
        errorMessage: null,
      } as Notification;
      manager.findOneOrFail.mockResolvedValue(loaded);
      return loaded;
    }

    it('valida el payload del canal ANTES de escribir en la DB', async () => {
      dispatcher.validateDraft.mockRejectedValue(new Error('payload invalido'));

      await expect(service.create('u-1', dto)).rejects.toThrow(
        'payload invalido',
      );
      expect(manager.save).not.toHaveBeenCalled();
    });

    it('marca SENT y sella sentAt cuando el envio funciona', async () => {
      stubLoadedNotification();

      const result = await service.create('u-1', dto);

      expect(result.status).toBe(NotificationStatusEnum.SENT);
      expect(result.sentAt).toBeInstanceOf(Date);
      expect(result.errorMessage).toBeNull();
    });

    it('marca FAILED y guarda el motivo cuando el envio falla', async () => {
      stubLoadedNotification();
      dispatcher.dispatch.mockRejectedValue(new Error('gateway caido'));

      const result = await service.create('u-1', dto);

      expect(result.status).toBe(NotificationStatusEnum.FAILED);
      expect(result.errorMessage).toBe('gateway caido');
      expect(result.sentAt).toBeNull();
    });

    it('no devuelve la relacion user al cliente', async () => {
      const loaded = stubLoadedNotification();
      loaded.user = { email: 'user@test.com' } as Notification['user'];

      const result = await service.create('u-1', dto);

      expect(result.user).toBeUndefined();
    });
  });

  describe('findOneByUser', () => {
    it('tira 404 cuando la notificacion no es del usuario', async () => {
      repo.findOne.mockResolvedValue(null);

      await expect(service.findOneByUser('u-1', 'n-9')).rejects.toThrow(
        NotFoundException,
      );
    });

    // El ownership no se chequea aparte: va en el WHERE. Devolver 404 y no 403
    // evita confirmarle a un tercero que el recurso existe.
    it('filtra por id Y userId en la misma query', async () => {
      repo.findOne.mockResolvedValue({ id: 'n-1' } as Notification);

      await service.findOneByUser('u-1', 'n-1');

      expect(repo.findOne).toHaveBeenCalledWith({
        where: { id: 'n-1', userId: 'u-1' },
      });
    });
  });

  describe('findAllByUser', () => {
    it('pagina y ordena por createdAt descendente', async () => {
      repo.findAndCount.mockResolvedValue([[], 42]);

      const result = await service.findAllByUser('u-1', { page: 3, limit: 10 });

      expect(repo.findAndCount).toHaveBeenCalledWith({
        where: { userId: 'u-1' },
        order: { createdAt: 'DESC' },
        skip: 20,
        take: 10,
      });
      expect(result).toEqual({ data: [], total: 42, page: 3, limit: 10 });
    });
  });

  describe('update', () => {
    it('revalida contra las reglas del canal despues de aplicar los cambios', async () => {
      repo.findOne.mockResolvedValue({
        id: 'n-1',
        channel: NotificationChannelEnum.SMS,
        content: 'corto',
      } as Notification);
      // save() es generico (T -> Promise<T & Notification>), asi que el mock
      // tiene que devolver la interseccion, no el partial pelado.
      repo.save.mockImplementation((entity) =>
        Promise.resolve(entity as typeof entity & Notification),
      );

      await service.update('u-1', 'n-1', { content: 'nuevo contenido' });

      expect(dispatcher.validateDraft).toHaveBeenCalledWith(
        expect.objectContaining({ content: 'nuevo contenido' }),
      );
    });
  });
});
