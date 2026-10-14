import { Notification } from '../../domain/notification';

export interface NotificationRepository {
  save(notification: Notification): Promise<void>;
  /** Inexistente o ajena = null. */
  findById(id: string, ownerId: string): Promise<Notification | null>;
  /** Más nuevas primero: created_at desc, id desc. `page` empieza en 1. */
  listByOwner(
    ownerId: string,
    page: number,
    limit: number,
  ): Promise<{ items: Notification[]; total: number }>;
  /** true si existía y era del dueño. */
  delete(id: string, ownerId: string): Promise<boolean>;
}

export const NOTIFICATION_REPOSITORY = Symbol('NotificationRepository');
