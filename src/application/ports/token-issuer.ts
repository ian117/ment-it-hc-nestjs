export interface IssuedToken {
  accessToken: string;
  /** Segundos. */
  expiresIn: number;
}

export interface TokenIssuer {
  issue(userId: string): Promise<IssuedToken>;
}

export const TOKEN_ISSUER = Symbol('TokenIssuer');
