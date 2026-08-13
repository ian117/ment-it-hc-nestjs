import { Injectable, BadRequestException } from '@nestjs/common';
import {
  Notification,
  NotificationChannelEnum,
} from '../../entities/notification.entity';
import { BaseNotificationSender } from './base-notification.sender';
import { PushPayloadDto } from './payloads/push-payload.dto';

@Injectable()
export class PushNotificationSender extends BaseNotificationSender {
  readonly channel = NotificationChannelEnum.PUSH;
  readonly payloadDto = PushPayloadDto;

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
