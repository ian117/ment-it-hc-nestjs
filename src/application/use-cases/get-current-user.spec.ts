import { UserNotFound } from '../../domain/errors';
import {
  AuthWorld,
  buildAuthWorld,
  EMAIL,
  PASSWORD,
} from '../testing/auth-test-world';

describe('GetCurrentUser', () => {
  let w: AuthWorld;
  beforeEach(() => {
    w = buildAuthWorld();
  });

  it('devuelve el usuario', async () => {
    const user = await w.register.execute({ email: EMAIL, password: PASSWORD });
    const found = await w.getCurrentUser.execute({ userId: user.id });
    expect(found.id).toBe(user.id);
    expect(found.email.value).toBe(EMAIL);
  });

  it('lanza UserNotFound si no existe', async () => {
    await expect(
      w.getCurrentUser.execute({ userId: 'no-existe' }),
    ).rejects.toThrow(UserNotFound);
  });
});
