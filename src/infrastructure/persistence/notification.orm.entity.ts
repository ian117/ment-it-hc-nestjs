import {
  Check,
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryColumn,
} from 'typeorm';

import { UserOrmEntity } from './user.orm.entity';

/**
 * Entidad ORM de `notifications` (diseño 5, ADR-012). Nunca sale de
 * `infrastructure/`: el repositorio la traduce con NotificationMapper.
 *
 * El índice (user_id, created_at DESC, id DESC) vive solo en la migración:
 * TypeORM no sabe expresar el orden por columna en @Index.
 */
@Entity({ name: 'notifications' })
@Check('CHK_notifications_status', `"status" IN ('pending', 'sent', 'failed')`)
export class NotificationOrmEntity {
  @PrimaryColumn({ type: 'uuid' })
  id!: string;

  @Column({ name: 'user_id', type: 'uuid' })
  ownerId!: string;

  @ManyToOne(() => UserOrmEntity, { nullable: false, onDelete: 'CASCADE' })
  @JoinColumn({
    name: 'user_id',
    foreignKeyConstraintName: 'FK_notifications_user',
  })
  user?: UserOrmEntity;

  @Column({ type: 'varchar', length: 255 })
  title!: string;

  @Column({ type: 'text' })
  content!: string;

  /** varchar sin enum: el registro de canales vive en la app (ADR-004). */
  @Column({ type: 'varchar', length: 32 })
  channel!: string;

  @Column({ type: 'jsonb' })
  payload!: { recipient: string };

  @Column({ type: 'varchar', length: 16 })
  status!: string;

  @Column({ type: 'int', default: 0 })
  attempts!: number;

  @Column({ name: 'error_message', type: 'text', nullable: true })
  errorMessage!: string | null;

  @Column({ name: 'sent_at', type: 'timestamptz', nullable: true })
  sentAt!: Date | null;

  @Column({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;

  @Column({ name: 'updated_at', type: 'timestamptz' })
  updatedAt!: Date;
}
