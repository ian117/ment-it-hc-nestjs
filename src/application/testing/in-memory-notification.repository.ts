import { Notification, NotificationStatus } from '../../domain/notification';
import { NotificationRepository } from '../ports/notification.repository';
import { EventLog } from './event-log';

function clone(n: Notification): Notification {
  return Notification.restore({
    id: n.id,
    ownerId: n.ownerId,
    title: n.title,
    content: n.content,
    channel: n.channel,
    recipient: n.recipient,
    status: n.status,
    attempts: n.attempts,
    errorMessage: n.errorMessage,
    sentAt: n.sentAt,
    createdAt: n.createdAt,
    updatedAt: n.updatedAt,
  });
}

export class InMemoryNotificationRepository implements NotificationRepository {
  private readonly store = new Map<string, Notification>();
  /** Estado persistido en cada save, en orden. */
  readonly saves: { id: string; status: NotificationStatus }[] = [];

  constructor(private readonly log?: EventLog) {}

  get size(): number {
    return this.store.size;
  }

  /** Status ya persistido para un id (undefined si no existe). */
  persistedStatus(id: string): NotificationStatus | undefined {
    return this.store.get(id)?.status;
  }

  /** Copia de lo persistido, sin filtrar por dueño (para aserciones). */
  stored(id: string): Notification | undefined {
    const found = this.store.get(id);
    return found ? clone(found) : undefined;
  }

  save(notification: Notification): Promise<void> {
    this.store.set(notification.id, clone(notification));
    this.saves.push({ id: notification.id, status: notification.status });
    this.log?.push(`save:${notification.status}`);
    return Promise.resolve();
  }

  findById(id: string, ownerId: string): Promise<Notification | null> {
    const found = this.store.get(id);
    return Promise.resolve(
      found && found.ownerId === ownerId ? clone(found) : null,
    );
  }

  listByOwner(
    ownerId: string,
    page: number,
    limit: number,
  ): Promise<{ items: Notification[]; total: number }> {
    const own = [...this.store.values()]
      .filter((n) => n.ownerId === ownerId)
      .sort((a, b) => {
        const byDate = b.createdAt.getTime() - a.createdAt.getTime();
        if (byDate !== 0) return byDate;
        return a.id < b.id ? 1 : a.id > b.id ? -1 : 0;
      });
    const start = (page - 1) * limit;
    return Promise.resolve({
      items: own.slice(start, start + limit).map(clone),
      total: own.length,
    });
  }

  delete(id: string, ownerId: string): Promise<boolean> {
    const found = this.store.get(id);
    if (!found || found.ownerId !== ownerId) return Promise.resolve(false);
    this.store.delete(id);
    return Promise.resolve(true);
  }
}
