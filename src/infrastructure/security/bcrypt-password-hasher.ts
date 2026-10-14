import { createHash } from 'node:crypto';

import * as bcrypt from 'bcrypt';

import { PasswordHasher } from '../../application/ports/password-hasher';
import { PasswordHash } from '../../domain/password-hash';

const COST = 10;
/** bcrypt solo lee los primeros 72 bytes de la entrada. */
const BCRYPT_MAX_BYTES = 72;

/**
 * Adaptador bcrypt del puerto PasswordHasher (coste 10).
 *
 * bcrypt trunca en 72 bytes y el contrato admite contraseñas de hasta 128
 * caracteres: si la contraseña supera 72 bytes UTF-8 se pre-hashea con
 * sha256 -> base64 (44 caracteres) para que todos los bytes cuenten. Las de
 * hasta 72 bytes se hashean tal cual (ADR-014).
 */
export class BcryptPasswordHasher implements PasswordHasher {
  async hash(plain: string): Promise<PasswordHash> {
    return PasswordHash.of(await bcrypt.hash(this.prepare(plain), COST));
  }

  verify(plain: string, hash: PasswordHash): Promise<boolean> {
    return bcrypt.compare(this.prepare(plain), hash.value);
  }

  private prepare(plain: string): string {
    if (Buffer.byteLength(plain, 'utf8') <= BCRYPT_MAX_BYTES) return plain;
    return createHash('sha256').update(plain, 'utf8').digest('base64');
  }
}
