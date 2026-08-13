import { Injectable, BadRequestException } from '@nestjs/common';
import {
  Notification,
  NotificationChannelEnum,
} from '../../entities/notification.entity';
import { BaseNotificationSender } from './base-notification.sender';

@Injectable()
export class SmsNotificationSender extends BaseNotificationSender {
  readonly channel = NotificationChannelEnum.SMS;

  static readonly MAX_LENGTH = 160;

  protected resolveRecipient(notification: Notification): string {
    const phoneNumber = notification.metadata?.phoneNumber as
      string | undefined;

    if (!phoneNumber) {
      throw new BadRequestException('Missing phone number for SMS channel');
    }
    return phoneNumber;
  }

  protected buildPayload(notification: Notification): unknown {
    // Decision: rechazar, no truncar. El codigo anterior cortaba en 160 sin
    // avisarle a nadie -- el usuario creia haber mandado un mensaje que en
    // realidad llego mutilado. Perder contenido en silencio es peor que
    // fallar fuerte.
    if (notification.content.length > SmsNotificationSender.MAX_LENGTH) {
      throw new BadRequestException(
        `SMS content exceeds ${SmsNotificationSender.MAX_LENGTH} characters`,
      );
    }
    return { body: notification.content };
  }
}
