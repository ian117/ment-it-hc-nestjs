import { JwtService } from '@nestjs/jwt';

import { IssuedToken, TokenIssuer } from '../../application/ports/token-issuer';

/**
 * Adaptador JWT (HS256) del puerto TokenIssuer. Claims: `sub` (UUID del
 * usuario), `type: "access"`, y `iat`/`exp` que agrega la librería. Sin email.
 */
export class JwtTokenIssuer implements TokenIssuer {
  constructor(
    private readonly jwt: JwtService,
    private readonly expiresInSeconds: number,
  ) {}

  async issue(userId: string): Promise<IssuedToken> {
    const accessToken = await this.jwt.signAsync(
      { sub: userId, type: 'access' },
      { expiresIn: this.expiresInSeconds, algorithm: 'HS256' },
    );
    return { accessToken, expiresIn: this.expiresInSeconds };
  }
}
