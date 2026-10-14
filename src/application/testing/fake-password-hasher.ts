import { PasswordHash } from '../../domain/password-hash';
import { PasswordHasher } from '../ports/password-hasher';

export class FakePasswordHasher implements PasswordHasher {
  readonly hashed: string[] = [];
  readonly verified: { plain: string; hash: string }[] = [];

  hash(plain: string): Promise<PasswordHash> {
    this.hashed.push(plain);
    return Promise.resolve(PasswordHash.of(`hashed:${plain}`));
  }

  verify(plain: string, hash: PasswordHash): Promise<boolean> {
    this.verified.push({ plain, hash: hash.value });
    return Promise.resolve(hash.value === `hashed:${plain}`);
  }
}
