import { Email } from '../../domain/email';
import { User } from '../../domain/user';

export interface UserRepository {
  /**
   * Inserta o actualiza. Un usuario nuevo con email repetido lanza
   * EmailAlreadyRegistered (la unicidad la garantiza la base).
   */
  save(user: User): Promise<void>;
  findByEmail(email: Email): Promise<User | null>;
  findById(id: string): Promise<User | null>;
}

export const USER_REPOSITORY = Symbol('UserRepository');
