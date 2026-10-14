import { UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import { JwtStrategy } from './jwt.strategy';

describe('JwtStrategy.validate', () => {
  const strategy = new JwtStrategy({
    get: () => 'secret',
  } as unknown as ConfigService);
  const sub = '0B211DBE-4A57-406C-B3CF-42A5E7111AC6';

  it('entrega solo el id (en minúsculas) de un token de acceso', () => {
    expect(strategy.validate({ sub, type: 'access' })).toEqual({
      id: sub.toLowerCase(),
    });
  });

  it.each([
    { sub, type: 'refresh' },
    { sub },
    { sub: 'no-es-uuid', type: 'access' },
    { sub: 123, type: 'access' },
    { type: 'access' },
  ])('rechaza %j con 401', (payload) => {
    expect(() => strategy.validate(payload)).toThrow(UnauthorizedException);
  });
});
