import { ConfirmPasswordReset } from '../use-cases/confirm-password-reset';
import { GetCurrentUser } from '../use-cases/get-current-user';
import { Login } from '../use-cases/login';
import { RegisterUser } from '../use-cases/register-user';
import { RequestPasswordReset } from '../use-cases/request-password-reset';
import { FakeClock } from './fake-clock';
import { FakePasswordHasher } from './fake-password-hasher';
import { FakeResetTokenGenerator } from './fake-reset-token-generator';
import { FakeTokenIssuer } from './fake-token-issuer';
import { InMemoryResetTokenRepository } from './in-memory-reset-token.repository';
import { InMemoryUserRepository } from './in-memory-user.repository';
import { SequentialIdGenerator } from './sequential-id-generator';

export const RESET_TTL_MINUTES = 15;
export const EMAIL = 'ana@example.com';
export const PASSWORD = 'correct-horse-battery';

/** Cablea los casos de uso de auth con fakes en memoria (sin framework). */
export function buildAuthWorld() {
  const clock = new FakeClock();
  const users = new InMemoryUserRepository();
  const resetTokens = new InMemoryResetTokenRepository();
  const hasher = new FakePasswordHasher();
  const tokens = new FakeTokenIssuer();
  const generator = new FakeResetTokenGenerator();
  const ids = new SequentialIdGenerator();
  return {
    clock,
    users,
    resetTokens,
    hasher,
    tokens,
    generator,
    ids,
    register: new RegisterUser(users, hasher, ids, clock),
    login: new Login(users, hasher, tokens),
    getCurrentUser: new GetCurrentUser(users),
    requestReset: new RequestPasswordReset(
      users,
      resetTokens,
      generator,
      ids,
      clock,
      RESET_TTL_MINUTES,
    ),
    confirmReset: new ConfirmPasswordReset(
      users,
      resetTokens,
      hasher,
      generator,
      clock,
    ),
  };
}

export type AuthWorld = ReturnType<typeof buildAuthWorld>;
