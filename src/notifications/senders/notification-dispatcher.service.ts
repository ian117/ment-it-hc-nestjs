import { Inject, Injectable, InternalServerErrorException } from '@nestjs/common';
import { NotificationSenderInterface } from './notification-sender.interface';
import { Notification, NotificationChannelEnum } from '../../entities/notification.entity';
import { NOTIFICATION_SENDERS } from './notification-sender.token';

@Injectable()
export class NotificationDispatcherService {
  private readonly sendersMap: Map<NotificationChannelEnum, NotificationSenderInterface>;

  constructor(@Inject(NOTIFICATION_SENDERS) senders: NotificationSenderInterface[]) {
    this.sendersMap = new Map(senders.map((sender) => [sender.channel, sender]));
  }

  async dispatch(notification: Notification): Promise<void> {
    const sender = this.sendersMap.get(notification.channel);
    if (!sender) {
      throw new InternalServerErrorException(`No sender registered for channel: ${notification.channel}`);
    }
    await sender.send(notification);
  }
}