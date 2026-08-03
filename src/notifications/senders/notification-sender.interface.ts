import { Notification } from '../../entities/notification.entity';
import { NotificationChannelEnum } from '../../entities/notification.entity';

export interface NotificationSenderInterface {
  readonly channel: NotificationChannelEnum;
  send(notification: Notification): Promise<void>;
}