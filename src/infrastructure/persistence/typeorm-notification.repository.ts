import { Repository } from 'typeorm';

import { NotificationRepository } from '../../application/ports/notification.repository';
import { Notification } from '../../domain/notification';
import { NotificationMapper } from './notification.mapper';
import { NotificationOrmEntity } from './notification.orm.entity';

/**
 * Adaptador TypeORM del puerto NotificationRepository. Cada `save` es una
 * sentencia (transacción corta propia): nunca hay una transacción abierta
 * durante la entrega (ADR-008).
 */
export class TypeOrmNotificationRepository implements NotificationRepository {
  constructor(private readonly repo: Repository<NotificationOrmEntity>) {}

  async save(notification: Notification): Promise<void> {
    await this.repo.upsert(NotificationMapper.toOrm(notification), ['id']);
  }

  async findById(id: string, ownerId: string): Promise<Notification | null> {
    const row = await this.repo.findOne({ where: { id, ownerId } });
    return row ? NotificationMapper.toDomain(row) : null;
  }

  async listByOwner(
    ownerId: string,
    page: number,
    limit: number,
  ): Promise<{ items: Notification[]; total: number }> {
    const [rows, total] = await this.repo.findAndCount({
      where: { ownerId },
      order: { createdAt: 'DESC', id: 'DESC' },
      skip: (page - 1) * limit,
      take: limit,
    });
    return {
      items: rows.map((row) => NotificationMapper.toDomain(row)),
      total,
    };
  }

  async delete(id: string, ownerId: string): Promise<boolean> {
    const result = await this.repo.delete({ id, ownerId });
    return (result.affected ?? 0) > 0;
  }
}
