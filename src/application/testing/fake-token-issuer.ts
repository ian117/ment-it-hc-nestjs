import { IssuedToken, TokenIssuer } from '../ports/token-issuer';

export class FakeTokenIssuer implements TokenIssuer {
  issue(userId: string): Promise<IssuedToken> {
    return Promise.resolve({
      accessToken: `token-for-${userId}`,
      expiresIn: 3600,
    });
  }
}
