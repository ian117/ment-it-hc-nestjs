import { NotificationNotFound } from '../../domain/errors';
import { Notification } from '../../domain/notification';
import { NotificationRepository } from '../ports/notification.repository';

export interface GetMyNotificationInput {
  ownerId: string;
  id: string;
}

export class GetMyNotification {
  constructor(private readonly notifications: NotificationRepository) {}

  async execute(input: GetMyNotificationInput): Promise<Notification> {
    const found = await this.notifications.findById(input.id, input.ownerId);
    if (!found) throw new NotificationNotFound(input.id);
    return found;
  }
}
