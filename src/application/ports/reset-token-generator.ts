export interface GeneratedResetToken {
  /** Token en claro, de alta entropía. Nunca se persiste. */
  token: string;
  /** sha256 hex (64 caracteres) del token. */
  tokenHash: string;
}

export interface ResetTokenGenerator {
  generate(): GeneratedResetToken;
  hash(token: string): string;
}

export const RESET_TOKEN_GENERATOR = Symbol('ResetTokenGenerator');
