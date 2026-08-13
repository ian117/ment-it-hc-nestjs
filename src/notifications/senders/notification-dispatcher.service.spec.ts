import {
  BadRequestException,
  InternalServerErrorException,
} from '@nestjs/common';
import {
  Notification,
  NotificationChannelEnum,
} from '../../entities/notification.entity';
import { NotificationDispatcherService } from './notification-dispatcher.service';
import { EmailNotificationSender } from './email-sender.service';
import { SmsNotificationSender } from './sms-sender.service';
import { PushNotificationSender } from './push-sender.service';

describe('NotificationDispatcherService', () => {
  let dispatcher: NotificationDispatcherService;
  let push: PushNotificationSender;

  beforeEach(() => {
    push = new PushNotificationSender();
    dispatcher = new NotificationDispatcherService([
      new EmailNotificationSender(),
      new SmsNotificationSender(),
      push,
    ]);
  });

  describe('dispatch', () => {
    it('resuelve el sender por canal y le delega el envio', async () => {
      const spy = jest.spyOn(push, 'send').mockResolvedValue(undefined);
      const notification = {
        channel: NotificationChannelEnum.PUSH,
      } as Notification;

      await dispatcher.dispatch(notification);

      expect(spy).toHaveBeenCalledWith(notification);
    });

    it('tira 500 si el canal no tiene sender registrado', async () => {
      const orphan = { channel: 'telegram' } as unknown as Notification;

      await expect(dispatcher.dispatch(orphan)).rejects.toThrow(
        InternalServerErrorException,
      );
    });
  });

  describe('validateDraft', () => {
    it('acepta un payload que cumple el DTO del canal', async () => {
      await expect(
        dispatcher.validateDraft({
          channel: NotificationChannelEnum.PUSH,
          title: 't',
          content: 'c',
          metadata: { deviceToken: 'fcm-abc' },
        }),
      ).resolves.toBeUndefined();
    });

    it('rechaza cuando falta un campo requerido por el canal', async () => {
      await expect(
        dispatcher.validateDraft({
          channel: NotificationChannelEnum.PUSH,
          title: 't',
          content: 'c',
          metadata: {},
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('rechaza un telefono que no es E.164', async () => {
      await expect(
        dispatcher.validateDraft({
          channel: NotificationChannelEnum.SMS,
          title: 't',
          content: 'c',
          metadata: { phoneNumber: 'pepe' },
        }),
      ).rejects.toThrow(BadRequestException);
    });

    // El limite de 160 no vive en el DTO de metadata: mira `content`. Sale del
    // segundo hook del contrato, validateDraft del sender.
    it('aplica tambien las reglas del canal sobre la notificacion entera', async () => {
      await expect(
        dispatcher.validateDraft({
          channel: NotificationChannelEnum.SMS,
          title: 't',
          content: 'x'.repeat(161),
          metadata: { phoneNumber: '+5491123456789' },
        }),
      ).rejects.toThrow(/160/);
    });

    it('email no exige metadata porque su payload es opcional', async () => {
      await expect(
        dispatcher.validateDraft({
          channel: NotificationChannelEnum.EMAIL,
          title: 't',
          content: 'c',
        }),
      ).resolves.toBeUndefined();
    });
  });
});
