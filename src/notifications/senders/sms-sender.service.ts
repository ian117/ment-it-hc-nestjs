import { Injectable, BadRequestException } from '@nestjs/common';
import {
  Notification,
  NotificationChannelEnum,
} from '../../entities/notification.entity';
import { BaseNotificationSender } from './base-notification.sender';
import { SmsPayloadDto } from './payloads/sms-payload.dto';
import { NotificationDraft } from './notification-sender.interface';

@Injectable()
export class SmsNotificationSender extends BaseNotificationSender {
  readonly channel = NotificationChannelEnum.SMS;
  readonly payloadDto = SmsPayloadDto;

  static readonly MAX_LENGTH = 160;

  /**
   * El limite de 160 mira `content`, que es un campo comun a todos los canales
   * -- no entra en el DTO de metadata. Por eso el contrato tiene este segundo
   * hook: reglas del canal sobre la notificacion entera.
   */
  override validateDraft(draft: NotificationDraft): void {
    if (draft.content.length > SmsNotificationSender.MAX_LENGTH) {
      throw new BadRequestException(
        `SMS content exceeds ${SmsNotificationSender.MAX_LENGTH} characters`,
      );
    }
  }

  protected resolveRecipient(notification: Notification): string {
    const phoneNumber = notification.metadata?.phoneNumber as
      string | undefined;

    if (!phoneNumber) {
      throw new BadRequestException('Missing phone number for SMS channel');
    }
    return phoneNumber;
  }

  protected buildPayload(notification: Notification): unknown {
    // Se revalida aca a proposito: validateDraft protege la request, esto
    // protege la invariante. Un registro viejo o una escritura por fuera del
    // controller no pueden colarse a un envio de 300 caracteres.
    this.validateDraft(notification);
    return { body: notification.content };
  }
}
