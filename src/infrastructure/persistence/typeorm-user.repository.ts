import { QueryFailedError, Repository } from 'typeorm';

import { UserRepository } from '../../application/ports/user.repository';
import { Email } from '../../domain/email';
import { EmailAlreadyRegistered } from '../../domain/errors';
import { User } from '../../domain/user';
import { UserMapper } from './user.mapper';
import { UserOrmEntity } from './user.orm.entity';

const UNIQUE_VIOLATION = '23505';

function isUniqueViolation(error: unknown): boolean {
  return (
    error instanceof QueryFailedError &&
    (error as QueryFailedError & { code?: string }).code === UNIQUE_VIOLATION
  );
}

/**
 * Adaptador TypeORM del puerto UserRepository. Cada `save` es una sentencia
 * (transacción corta propia).
 */
export class TypeOrmUserRepository implements UserRepository {
  constructor(private readonly repo: Repository<UserOrmEntity>) {}

  async save(user: User): Promise<void> {
    try {
      await this.repo.upsert(UserMapper.toOrm(user), ['id']);
    } catch (error) {
      // La unicidad del email la garantiza la base, no un chequeo previo.
      if (isUniqueViolation(error)) throw new EmailAlreadyRegistered();
      throw error;
    }
  }

  async findByEmail(email: Email): Promise<User | null> {
    const row = await this.repo.findOne({ where: { email: email.value } });
    return row ? UserMapper.toDomain(row) : null;
  }

  async findById(id: string): Promise<User | null> {
    const row = await this.repo.findOne({ where: { id } });
    return row ? UserMapper.toDomain(row) : null;
  }
}
