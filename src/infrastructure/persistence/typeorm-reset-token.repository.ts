import { Repository } from 'typeorm';

import { ResetTokenRepository } from '../../application/ports/reset-token.repository';
import { PasswordResetToken } from '../../domain/password-reset-token';
import { ResetTokenMapper } from './reset-token.mapper';
import { ResetTokenOrmEntity } from './reset-token.orm.entity';

/** Adaptador TypeORM del puerto ResetTokenRepository. */
export class TypeOrmResetTokenRepository implements ResetTokenRepository {
  constructor(private readonly repo: Repository<ResetTokenOrmEntity>) {}

  async save(token: PasswordResetToken): Promise<void> {
    await this.repo.insert(ResetTokenMapper.toOrm(token));
  }

  async findByHash(tokenHash: string): Promise<PasswordResetToken | null> {
    const row = await this.repo.findOne({ where: { tokenHash } });
    return row ? ResetTokenMapper.toDomain(row) : null;
  }

  /**
   * UPDATE ... WHERE id AND used_at IS NULL: si dos confirmaciones compiten,
   * solo una afecta una fila (cierra la carrera de doble uso, ADR-013).
   */
  async consume(token: PasswordResetToken): Promise<boolean> {
    if (!token.usedAt) {
      throw new Error('consume() requires a token already marked as used');
    }
    const result = await this.repo
      .createQueryBuilder()
      .update(ResetTokenOrmEntity)
      .set({ usedAt: token.usedAt })
      .where('id = :id AND used_at IS NULL', { id: token.id })
      .execute();
    return (result.affected ?? 0) === 1;
  }
}
