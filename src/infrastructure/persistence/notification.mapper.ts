import { Notification, NotificationStatus } from '../../domain/notification';
import { NotificationOrmEntity } from './notification.orm.entity';

/** Traduce entre la entidad ORM y la de dominio; la ORM no sale de aquí. */
export class NotificationMapper {
  static toDomain(row: NotificationOrmEntity): Notification {
    return Notification.restore({
      id: row.id,
      ownerId: row.ownerId,
      title: row.title,
      content: row.content,
      channel: row.channel,
      recipient: row.payload.recipient,
      status: row.status as NotificationStatus,
      attempts: row.attempts,
      errorMessage: row.errorMessage,
      sentAt: row.sentAt,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    });
  }

  static toOrm(notification: Notification): NotificationOrmEntity {
    const row = new NotificationOrmEntity();
    row.id = notification.id;
    row.ownerId = notification.ownerId;
    row.title = notification.title;
    row.content = notification.content;
    row.channel = notification.channel;
    row.payload = { recipient: notification.recipient };
    row.status = notification.status;
    row.attempts = notification.attempts;
    row.errorMessage = notification.errorMessage;
    row.sentAt = notification.sentAt;
    row.createdAt = notification.createdAt;
    row.updatedAt = notification.updatedAt;
    return row;
  }
}
