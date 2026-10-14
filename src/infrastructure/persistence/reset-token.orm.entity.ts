import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryColumn,
  Unique,
} from 'typeorm';

import { UserOrmEntity } from './user.orm.entity';

/**
 * Entidad ORM de `password_reset_tokens` (diseño 5, ADR-014). Solo guarda el
 * sha256 del token: el token en claro nunca se persiste.
 */
@Entity({ name: 'password_reset_tokens' })
@Unique('UQ_password_reset_tokens_token_hash', ['tokenHash'])
export class ResetTokenOrmEntity {
  @PrimaryColumn({
    type: 'uuid',
    primaryKeyConstraintName: 'PK_password_reset_tokens',
  })
  id!: string;

  @Column({ name: 'user_id', type: 'uuid' })
  userId!: string;

  @ManyToOne(() => UserOrmEntity, { nullable: false, onDelete: 'CASCADE' })
  @JoinColumn({
    name: 'user_id',
    foreignKeyConstraintName: 'FK_password_reset_tokens_user',
  })
  user?: UserOrmEntity;

  @Column({ name: 'token_hash', type: 'char', length: 64 })
  tokenHash!: string;

  @Column({ name: 'expires_at', type: 'timestamptz' })
  expiresAt!: Date;

  @Column({ name: 'used_at', type: 'timestamptz', nullable: true })
  usedAt!: Date | null;

  @Column({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;
}
