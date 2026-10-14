import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { JwtModule, JwtService } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { getRepositoryToken, TypeOrmModule } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { EXPOSE_RESET_TOKEN } from './api/auth/expose-reset-token';
import { JwtStrategy } from './api/auth/jwt.strategy';
import { AuthController } from './api/auth.controller';
import { CLOCK, type Clock } from './application/ports/clock';
import {
  ID_GENERATOR,
  type IdGenerator,
} from './application/ports/id-generator';
import {
  PASSWORD_HASHER,
  type PasswordHasher,
} from './application/ports/password-hasher';
import {
  RESET_TOKEN_GENERATOR,
  type ResetTokenGenerator,
} from './application/ports/reset-token-generator';
import {
  RESET_TOKEN_REPOSITORY,
  type ResetTokenRepository,
} from './application/ports/reset-token.repository';
import {
  TOKEN_ISSUER,
  type TokenIssuer,
} from './application/ports/token-issuer';
import {
  USER_REPOSITORY,
  type UserRepository,
} from './application/ports/user.repository';
import {
  CONFIRM_PASSWORD_RESET,
  GET_CURRENT_USER,
  LOGIN,
  REGISTER_USER,
  REQUEST_PASSWORD_RESET,
} from './application/tokens';
import { ConfirmPasswordReset } from './application/use-cases/confirm-password-reset';
import { GetCurrentUser } from './application/use-cases/get-current-user';
import { Login } from './application/use-cases/login';
import { RegisterUser } from './application/use-cases/register-user';
import { RequestPasswordReset } from './application/use-cases/request-password-reset';
import { CommonModule } from './common.module';
import { ResetTokenOrmEntity } from './infrastructure/persistence/reset-token.orm.entity';
import { TypeOrmResetTokenRepository } from './infrastructure/persistence/typeorm-reset-token.repository';
import { TypeOrmUserRepository } from './infrastructure/persistence/typeorm-user.repository';
import { UserOrmEntity } from './infrastructure/persistence/user.orm.entity';
import { BcryptPasswordHasher } from './infrastructure/security/bcrypt-password-hasher';
import { CryptoResetTokenGenerator } from './infrastructure/security/crypto-reset-token-generator';
import { JwtTokenIssuer } from './infrastructure/security/jwt-token-issuer';

/**
 * Raíz de composición de auth: el único lugar que conoce las clases
 * concretas de repositorios, hasher, emisor JWT y generador de tokens.
 */
@Module({
  imports: [
    CommonModule,
    TypeOrmModule.forFeature([UserOrmEntity, ResetTokenOrmEntity]),
    PassportModule,
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        secret: config.get<string>('jwt.secret'),
      }),
    }),
  ],
  controllers: [AuthController],
  providers: [
    JwtStrategy,
    {
      provide: EXPOSE_RESET_TOKEN,
      useFactory: (config: ConfigService) =>
        config.get<string>('nodeEnv') !== 'production',
      inject: [ConfigService],
    },
    {
      provide: USER_REPOSITORY,
      useFactory: (repo: Repository<UserOrmEntity>) =>
        new TypeOrmUserRepository(repo),
      inject: [getRepositoryToken(UserOrmEntity)],
    },
    {
      provide: RESET_TOKEN_REPOSITORY,
      useFactory: (repo: Repository<ResetTokenOrmEntity>) =>
        new TypeOrmResetTokenRepository(repo),
      inject: [getRepositoryToken(ResetTokenOrmEntity)],
    },
    { provide: PASSWORD_HASHER, useFactory: () => new BcryptPasswordHasher() },
    {
      provide: TOKEN_ISSUER,
      useFactory: (jwt: JwtService, config: ConfigService) =>
        new JwtTokenIssuer(
          jwt,
          config.getOrThrow<number>('jwt.expiresInSeconds'),
        ),
      inject: [JwtService, ConfigService],
    },
    {
      provide: RESET_TOKEN_GENERATOR,
      useFactory: () => new CryptoResetTokenGenerator(),
    },
    {
      provide: REGISTER_USER,
      useFactory: (
        users: UserRepository,
        hasher: PasswordHasher,
        ids: IdGenerator,
        clock: Clock,
      ) => new RegisterUser(users, hasher, ids, clock),
      inject: [USER_REPOSITORY, PASSWORD_HASHER, ID_GENERATOR, CLOCK],
    },
    {
      provide: LOGIN,
      useFactory: (
        users: UserRepository,
        hasher: PasswordHasher,
        tokens: TokenIssuer,
      ) => new Login(users, hasher, tokens),
      inject: [USER_REPOSITORY, PASSWORD_HASHER, TOKEN_ISSUER],
    },
    {
      provide: GET_CURRENT_USER,
      useFactory: (users: UserRepository) => new GetCurrentUser(users),
      inject: [USER_REPOSITORY],
    },
    {
      provide: REQUEST_PASSWORD_RESET,
      useFactory: (
        users: UserRepository,
        resetTokens: ResetTokenRepository,
        generator: ResetTokenGenerator,
        ids: IdGenerator,
        clock: Clock,
        config: ConfigService,
      ) =>
        new RequestPasswordReset(
          users,
          resetTokens,
          generator,
          ids,
          clock,
          config.getOrThrow<number>('resetTokenExpiresMinutes'),
        ),
      inject: [
        USER_REPOSITORY,
        RESET_TOKEN_REPOSITORY,
        RESET_TOKEN_GENERATOR,
        ID_GENERATOR,
        CLOCK,
        ConfigService,
      ],
    },
    {
      provide: CONFIRM_PASSWORD_RESET,
      useFactory: (
        users: UserRepository,
        resetTokens: ResetTokenRepository,
        hasher: PasswordHasher,
        generator: ResetTokenGenerator,
        clock: Clock,
      ) =>
        new ConfirmPasswordReset(users, resetTokens, hasher, generator, clock),
      inject: [
        USER_REPOSITORY,
        RESET_TOKEN_REPOSITORY,
        PASSWORD_HASHER,
        RESET_TOKEN_GENERATOR,
        CLOCK,
      ],
    },
  ],
})
export class AuthModule {}
