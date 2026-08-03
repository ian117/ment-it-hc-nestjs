import { Injectable, BadRequestException } from '@nestjs/common';
import { NotificationSenderInterface } from './notification-sender.interface';
import { Notification, NotificationChannelEnum } from '../../entities/notification.entity';

@Injectable()
export class PushNotificationSender implements NotificationSenderInterface {
  readonly channel = NotificationChannelEnum.PUSH;

  async send(notification: Notification): Promise<void> {
    const deviceToken = this.validateDeviceToken(notification);
    const payload = this.formatPayload(notification);
    this.registerSend(deviceToken, payload);
  }

  private validateDeviceToken(notification: Notification): string {
    const token = notification.metadata?.deviceToken;
    if (!token) throw new BadRequestException('Missing device token');
    return token;
  }

  private formatPayload(notification: Notification): Record<string, any> {
    return { title: notification.title, body: notification.content, sound: 'default' };
  }

  private registerSend(deviceToken: string, payload: Record<string, any>): void {
    console.log(`[PUSH] Token: ${deviceToken} | payload:`, payload);
  }
}