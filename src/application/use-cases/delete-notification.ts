import { NotificationNotFound } from '../../domain/errors';
import { NotificationRepository } from '../ports/notification.repository';

export interface DeleteNotificationInput {
  ownerId: string;
  id: string;
}

export class DeleteNotification {
  constructor(private readonly notifications: NotificationRepository) {}

  async execute(input: DeleteNotificationInput): Promise<void> {
    const deleted = await this.notifications.delete(input.id, input.ownerId);
    if (!deleted) throw new NotificationNotFound(input.id);
  }
}
