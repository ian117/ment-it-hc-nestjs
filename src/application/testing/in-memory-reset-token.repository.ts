import { PasswordResetToken } from '../../domain/password-reset-token';
import { ResetTokenRepository } from '../ports/reset-token.repository';

function clone(t: PasswordResetToken): PasswordResetToken {
  return PasswordResetToken.restore({
    id: t.id,
    userId: t.userId,
    tokenHash: t.tokenHash,
    expiresAt: t.expiresAt,
    usedAt: t.usedAt,
    createdAt: t.createdAt,
  });
}

export class InMemoryResetTokenRepository implements ResetTokenRepository {
  private readonly store = new Map<string, PasswordResetToken>();

  get size(): number {
    return this.store.size;
  }

  /** Todos los persistidos (copias), para aserciones. */
  all(): PasswordResetToken[] {
    return [...this.store.values()].map(clone);
  }

  save(token: PasswordResetToken): Promise<void> {
    this.store.set(token.id, clone(token));
    return Promise.resolve();
  }

  findByHash(tokenHash: string): Promise<PasswordResetToken | null> {
    for (const t of this.store.values()) {
      if (t.tokenHash === tokenHash) return Promise.resolve(clone(t));
    }
    return Promise.resolve(null);
  }

  /** Atómico: persiste usedAt solo si lo persistido sigue sin usar. */
  consume(token: PasswordResetToken): Promise<boolean> {
    const stored = this.store.get(token.id);
    if (!stored || stored.usedAt !== null || token.usedAt === null) {
      return Promise.resolve(false);
    }
    this.store.set(token.id, clone(token));
    return Promise.resolve(true);
  }
}
