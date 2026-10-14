import { createHash, randomBytes } from 'node:crypto';

import {
  GeneratedResetToken,
  ResetTokenGenerator,
} from '../../application/ports/reset-token-generator';

/** Token de 32 bytes aleatorios (hex) + sha256 hex de 64 caracteres. */
export class CryptoResetTokenGenerator implements ResetTokenGenerator {
  generate(): GeneratedResetToken {
    const token = randomBytes(32).toString('hex');
    return { token, tokenHash: this.hash(token) };
  }

  hash(token: string): string {
    return createHash('sha256').update(token, 'utf8').digest('hex');
  }
}
