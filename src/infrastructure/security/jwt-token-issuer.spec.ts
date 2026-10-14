import { JwtService } from '@nestjs/jwt';

import { JwtTokenIssuer } from './jwt-token-issuer';

describe('JwtTokenIssuer', () => {
  const jwt = new JwtService({ secret: 'test-secret' });
  const userId = '0b211dbe-4a57-406c-b3cf-42a5e7111ac6';

  it('emite un JWT HS256 con sub, type access, iat y exp; sin email', async () => {
    const issuer = new JwtTokenIssuer(jwt, 3600);
    const issued = await issuer.issue(userId);

    expect(issued.expiresIn).toBe(3600);
    const header = JSON.parse(
      Buffer.from(issued.accessToken.split('.')[0], 'base64url').toString(),
    ) as { alg: string };
    expect(header.alg).toBe('HS256');

    const payload = await jwt.verifyAsync<Record<string, unknown>>(
      issued.accessToken,
    );
    expect(payload).toEqual({
      sub: userId,
      type: 'access',
      iat: expect.any(Number) as number,
      exp: expect.any(Number) as number,
    });
    expect((payload.exp as number) - (payload.iat as number)).toBe(3600);
  });

  it('respeta la vigencia configurada', async () => {
    const issued = await new JwtTokenIssuer(jwt, 60).issue(userId);
    const payload = jwt.decode<{ iat: number; exp: number }>(
      issued.accessToken,
    );
    expect(issued.expiresIn).toBe(60);
    expect(payload.exp - payload.iat).toBe(60);
  });
});
