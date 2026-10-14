import { Notification } from '../../domain/notification';
import { NotificationRepository } from '../ports/notification.repository';

export interface ListMyNotificationsInput {
  ownerId: string;
  page: number;
  limit: number;
}

export interface ListMyNotificationsOutput {
  data: Notification[];
  total: number;
  page: number;
  limit: number;
}

export class ListMyNotifications {
  constructor(private readonly notifications: NotificationRepository) {}

  async execute(
    input: ListMyNotificationsInput,
  ): Promise<ListMyNotificationsOutput> {
    const { items, total } = await this.notifications.listByOwner(
      input.ownerId,
      input.page,
      input.limit,
    );
    return { data: items, total, page: input.page, limit: input.limit };
  }
}
