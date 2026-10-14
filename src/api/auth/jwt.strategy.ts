import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';

import type { AuthenticatedUser } from './authenticated-user';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Guard sin estado (ADR-014): valida firma (HS256), expiración, `type` y que
 * `sub` sea un UUID, y entrega solo el id. No consulta la base.
 */
@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(configService: ConfigService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: configService.get<string>('jwt.secret')!,
      algorithms: ['HS256'],
    });
  }

  validate(payload: { sub?: unknown; type?: unknown }): AuthenticatedUser {
    if (
      payload.type !== 'access' ||
      typeof payload.sub !== 'string' ||
      !UUID.test(payload.sub)
    ) {
      throw new UnauthorizedException();
    }
    return { id: payload.sub.toLowerCase() };
  }
}
