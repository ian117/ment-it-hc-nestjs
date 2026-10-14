import { PasswordResetToken } from '../../domain/password-reset-token';

export interface ResetTokenRepository {
  /** Inserta un token nuevo. */
  save(token: PasswordResetToken): Promise<void>;
  findByHash(tokenHash: string): Promise<PasswordResetToken | null>;
  /**
   * Persiste `usedAt` solo si en la base sigue sin usar. Devuelve false si
   * otro lo consumió antes (UPDATE ... WHERE used_at IS NULL).
   */
  consume(token: PasswordResetToken): Promise<boolean>;
}

export const RESET_TOKEN_REPOSITORY = Symbol('ResetTokenRepository');
