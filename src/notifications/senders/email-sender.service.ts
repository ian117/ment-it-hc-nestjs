import { Injectable, BadRequestException } from '@nestjs/common';
import {
  Notification,
  NotificationChannelEnum,
} from '../../entities/notification.entity';
import { BaseNotificationSender } from './base-notification.sender';

@Injectable()
export class EmailNotificationSender extends BaseNotificationSender {
  readonly channel = NotificationChannelEnum.EMAIL;

  private static readonly EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  protected resolveRecipient(notification: Notification): string {
    // Por defecto va al email de la cuenta; metadata.to permite redirigirlo.
    const email =
      (notification.metadata?.to as string | undefined) ??
      notification.user?.email;

    if (!email || !EmailNotificationSender.EMAIL_REGEX.test(email)) {
      throw new BadRequestException('Invalid recipient email format');
    }
    return email;
  }

  protected buildPayload(notification: Notification): unknown {
    return {
      subject: notification.title,
      html: `<h1>${notification.title}</h1><p>${notification.content}</p>`,
    };
  }
}
