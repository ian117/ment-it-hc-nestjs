import { PasswordHash } from '../../domain/password-hash';

export interface PasswordHasher {
  hash(plain: string): Promise<PasswordHash>;
  verify(plain: string, hash: PasswordHash): Promise<boolean>;
}

export const PASSWORD_HASHER = Symbol('PasswordHasher');
