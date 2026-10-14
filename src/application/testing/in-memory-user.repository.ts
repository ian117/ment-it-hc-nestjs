import { Email } from '../../domain/email';
import { EmailAlreadyRegistered } from '../../domain/errors';
import { User } from '../../domain/user';
import { UserRepository } from '../ports/user.repository';

function clone(u: User): User {
  return User.restore({
    id: u.id,
    email: u.email,
    passwordHash: u.passwordHash,
    createdAt: u.createdAt,
    updatedAt: u.updatedAt,
  });
}

export class InMemoryUserRepository implements UserRepository {
  private readonly store = new Map<string, User>();
  saveCount = 0;

  get size(): number {
    return this.store.size;
  }

  /** Copia de lo persistido (para aserciones). */
  stored(id: string): User | undefined {
    const found = this.store.get(id);
    return found ? clone(found) : undefined;
  }

  save(user: User): Promise<void> {
    // Como la restricción unique de la base: otro usuario con el mismo email.
    for (const other of this.store.values()) {
      if (other.id !== user.id && other.email.equals(user.email)) {
        return Promise.reject(new EmailAlreadyRegistered());
      }
    }
    this.store.set(user.id, clone(user));
    this.saveCount += 1;
    return Promise.resolve();
  }

  findByEmail(email: Email): Promise<User | null> {
    for (const u of this.store.values()) {
      if (u.email.equals(email)) return Promise.resolve(clone(u));
    }
    return Promise.resolve(null);
  }

  findById(id: string): Promise<User | null> {
    const found = this.store.get(id);
    return Promise.resolve(found ? clone(found) : null);
  }
}
