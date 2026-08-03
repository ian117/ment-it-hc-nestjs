import { Injectable, BadRequestException } from '@nestjs/common';
import { NotificationSenderInterface } from './notification-sender.interface';
import { Notification, NotificationChannelEnum } from '../../entities/notification.entity';

@Injectable()
export class SmsNotificationSender implements NotificationSenderInterface {
  readonly channel = NotificationChannelEnum.SMS;

  async send(notification: Notification): Promise<void> {
    const content = this.truncateContent(notification.content);
    this.registerSend(notification, content);
  }

  private truncateContent(content: string): string {
    const MAX_LENGTH = 160;
    return content.length > MAX_LENGTH ? content.slice(0, MAX_LENGTH) : content;
  }

  private registerSend(notification: Notification, content: string): void {
    const phoneNumber = notification.metadata?.phoneNumber ?? 'unknown';
    console.log(`[SMS] To: ${phoneNumber} | At: ${new Date().toISOString()} | "${content}"`);
  }
}