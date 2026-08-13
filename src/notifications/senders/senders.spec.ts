import { BadRequestException } from '@nestjs/common';
import {
  Notification,
  NotificationChannelEnum,
  NotificationStatusEnum,
} from '../../entities/notification.entity';
import { EmailNotificationSender } from './email-sender.service';
import { SmsNotificationSender } from './sms-sender.service';
import { PushNotificationSender } from './push-sender.service';
import { BaseNotificationSender } from './base-notification.sender';

function buildNotification(
  overrides: Partial<Notification> = {},
): Notification {
  return {
    id: 'n-1',
    userId: 'u-1',
    title: 'Titulo',
    content: 'Contenido',
    channel: NotificationChannelEnum.EMAIL,
    status: NotificationStatusEnum.PENDING,
    sentAt: null,
    errorMessage: null,
    metadata: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

describe('EmailNotificationSender', () => {
  const sender = new EmailNotificationSender();

  it('usa el email de la cuenta cuando no hay metadata.to', async () => {
    const notification = buildNotification({
      user: { email: 'user@test.com' } as Notification['user'],
    });
    await expect(sender.send(notification)).resolves.toBeUndefined();
  });

  it('permite redirigir el envio con metadata.to', async () => {
    const notification = buildNotification({
      user: { email: 'user@test.com' } as Notification['user'],
      metadata: { to: 'otro@test.com' },
    });
    await expect(sender.send(notification)).resolves.toBeUndefined();
  });

  it('rechaza cuando no hay ningun destinatario', async () => {
    await expect(sender.send(buildNotification())).rejects.toThrow(
      BadRequestException,
    );
  });

  it('rechaza un email con formato invalido', async () => {
    const notification = buildNotification({ metadata: { to: 'no-es-mail' } });
    await expect(sender.send(notification)).rejects.toThrow(
      BadRequestException,
    );
  });
});

describe('SmsNotificationSender', () => {
  const sender = new SmsNotificationSender();

  it('envia con telefono y contenido dentro del limite', async () => {
    const notification = buildNotification({
      channel: NotificationChannelEnum.SMS,
      metadata: { phoneNumber: '+5491123456789' },
    });
    await expect(sender.send(notification)).resolves.toBeUndefined();
  });

  it('rechaza cuando falta el telefono', async () => {
    const notification = buildNotification({
      channel: NotificationChannelEnum.SMS,
    });
    await expect(sender.send(notification)).rejects.toThrow(
      BadRequestException,
    );
  });

  // El comportamiento viejo truncaba en silencio; este test fija la decision.
  it('rechaza contenido de mas de 160 caracteres en vez de truncarlo', () => {
    const draft = {
      channel: NotificationChannelEnum.SMS,
      title: 'x',
      content: 'x'.repeat(161),
    };
    expect(() => sender.validateDraft(draft)).toThrow(BadRequestException);
  });

  it('acepta exactamente 160 caracteres', () => {
    const draft = {
      channel: NotificationChannelEnum.SMS,
      title: 'x',
      content: 'x'.repeat(160),
    };
    expect(() => sender.validateDraft(draft)).not.toThrow();
  });
});

describe('PushNotificationSender', () => {
  const sender = new PushNotificationSender();

  it('envia con deviceToken', async () => {
    const notification = buildNotification({
      channel: NotificationChannelEnum.PUSH,
      metadata: { deviceToken: 'fcm-abc' },
    });
    await expect(sender.send(notification)).resolves.toBeUndefined();
  });

  it('rechaza cuando falta el deviceToken', async () => {
    const notification = buildNotification({
      channel: NotificationChannelEnum.PUSH,
    });
    await expect(sender.send(notification)).rejects.toThrow(
      BadRequestException,
    );
  });
});

describe('BaseNotificationSender (Template Method)', () => {
  // Lo que este test protege: el ORDEN de los pasos. Es la invariante que
  // justifica que send() sea concreto y no abstracto.
  class SpySender extends BaseNotificationSender {
    readonly channel = NotificationChannelEnum.EMAIL;
    readonly calls: string[] = [];

    protected resolveRecipient(): string {
      this.calls.push('resolveRecipient');
      return 'destino';
    }

    protected buildPayload(): unknown {
      this.calls.push('buildPayload');
      return {};
    }

    protected override deliver(): Promise<void> {
      this.calls.push('deliver');
      return Promise.resolve();
    }

    protected override register(): void {
      this.calls.push('register');
    }
  }

  it('ejecuta los pasos en orden: resolver, armar, entregar, registrar', async () => {
    const sender = new SpySender();
    await sender.send(buildNotification());

    expect(sender.calls).toEqual([
      'resolveRecipient',
      'buildPayload',
      'deliver',
      'register',
    ]);
  });

  it('no registra el envio si la validacion del destinatario falla', async () => {
    class FailingSender extends SpySender {
      protected override resolveRecipient(): string {
        throw new BadRequestException('destinatario invalido');
      }
    }

    const sender = new FailingSender();
    await expect(sender.send(buildNotification())).rejects.toThrow(
      BadRequestException,
    );
    expect(sender.calls).not.toContain('register');
  });
});
