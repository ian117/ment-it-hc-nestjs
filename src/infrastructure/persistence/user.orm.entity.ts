import { Column, Entity, PrimaryColumn, Unique } from 'typeorm';

/**
 * Entidad ORM de `users` (diseño 5, ADR-014). Nunca sale de `infrastructure/`:
 * el repositorio la traduce con UserMapper. El id y los timestamps los pone el
 * dominio, no la base.
 */
@Entity({ name: 'users' })
@Unique('UQ_users_email', ['email'])
export class UserOrmEntity {
  @PrimaryColumn({ type: 'uuid', primaryKeyConstraintName: 'PK_users' })
  id!: string;

  @Column({ type: 'varchar', length: 320 })
  email!: string;

  @Column({ name: 'password_hash', type: 'text' })
  passwordHash!: string;

  @Column({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;

  @Column({ name: 'updated_at', type: 'timestamptz' })
  updatedAt!: Date;
}
