import { Injectable, BadRequestException } from '@nestjs/common';
import { NotificationSenderInterface } from './notification-sender.interface';
import { Notification, NotificationChannelEnum } from '../../entities/notification.entity';

@Injectable()
export class EmailNotificationSender implements NotificationSenderInterface {
  readonly channel = NotificationChannelEnum.EMAIL;

  async send(notification: Notification): Promise<void> {
    this.validateRecipient(notification);
    const template = this.generateTemplate(notification);
    this.registerSend(notification, template);
  }

  private validateRecipient(notification: Notification): void {
    const email = notification.user?.email;
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!email || !emailRegex.test(email)) {
      throw new BadRequestException('Invalid recipient email format');
    }
  }

  private generateTemplate(notification: Notification): string {
    return `<h1>${notification.title}</h1><p>${notification.content}</p>`;
  }

  private registerSend(notification: Notification, template: string): void {
    console.log(`[EMAIL] Sent to ${notification.user?.email} | template length: ${template.length}`);
  }
}