import { PasswordResetToken } from '../../domain/password-reset-token';
import { ResetTokenOrmEntity } from './reset-token.orm.entity';

/** Traduce entre la entidad ORM y la de dominio; la ORM no sale de aquí. */
export class ResetTokenMapper {
  static toDomain(row: ResetTokenOrmEntity): PasswordResetToken {
    return PasswordResetToken.restore({
      id: row.id,
      userId: row.userId,
      tokenHash: row.tokenHash,
      expiresAt: row.expiresAt,
      usedAt: row.usedAt,
      createdAt: row.createdAt,
    });
  }

  static toOrm(token: PasswordResetToken): ResetTokenOrmEntity {
    const row = new ResetTokenOrmEntity();
    row.id = token.id;
    row.userId = token.userId;
    row.tokenHash = token.tokenHash;
    row.expiresAt = token.expiresAt;
    row.usedAt = token.usedAt;
    row.createdAt = token.createdAt;
    return row;
  }
}
