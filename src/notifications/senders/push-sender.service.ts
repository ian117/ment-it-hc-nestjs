import { Injectable, BadRequestException } from '@nestjs/common';
import {
  Notification,
  NotificationChannelEnum,
} from '../../entities/notification.entity';
import { BaseNotificationSender } from './base-notification.sender';

@Injectable()
export class PushNotificationSender extends BaseNotificationSender {
  readonly channel = NotificationChannelEnum.PUSH;

  protected resolveRecipient(notification: Notification): string {
    const deviceToken = notification.metadata?.deviceToken as
      string | undefined;

    if (!deviceToken) {
      throw new BadRequestException('Missing device token');
    }
    return deviceToken;
  }

  protected buildPayload(notification: Notification): unknown {
    return {
      title: notification.title,
      body: notification.content,
      sound: 'default',
    };
  }
}
