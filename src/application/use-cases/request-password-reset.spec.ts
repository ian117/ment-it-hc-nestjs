import { InvalidEmail } from '../../domain/errors';
import {
  AuthWorld,
  buildAuthWorld,
  EMAIL,
  PASSWORD,
  RESET_TTL_MINUTES,
} from '../testing/auth-test-world';

describe('RequestPasswordReset', () => {
  let w: AuthWorld;
  beforeEach(() => {
    w = buildAuthWorld();
  });

  it('usuario existente: devuelve el token en claro y guarda solo el hash', async () => {
    const user = await w.register.execute({ email: EMAIL, password: PASSWORD });
    const token = await w.requestReset.execute({ email: 'Ana@Example.com' });

    expect(token).toBe('reset-token-1');
    const saved = w.resetTokens.all();
    expect(saved).toHaveLength(1);
    expect(saved[0].userId).toBe(user.id);
    expect(saved[0].tokenHash).toBe(w.generator.hash(token!));
    expect(saved[0].tokenHash).not.toBe(token);
    expect(JSON.stringify(saved[0])).not.toContain(`"${token}"`);
    expect(saved[0].usedAt).toBeNull();
  });

  it('expiresAt = now + ttl', async () => {
    await w.register.execute({ email: EMAIL, password: PASSWORD });
    await w.requestReset.execute({ email: EMAIL });
    const [saved] = w.resetTokens.all();
    expect(saved.expiresAt.getTime()).toBe(
      w.clock.now().getTime() + RESET_TTL_MINUTES * 60_000,
    );
    expect(saved.createdAt).toEqual(w.clock.now());
  });

  it('usuario inexistente: null y nada guardado', async () => {
    await expect(
      w.requestReset.execute({ email: 'nadie@example.com' }),
    ).resolves.toBeNull();
    expect(w.resetTokens.size).toBe(0);
  });

  it('email inválido lanza InvalidEmail', async () => {
    await expect(w.requestReset.execute({ email: 'x' })).rejects.toThrow(
      InvalidEmail,
    );
    expect(w.resetTokens.size).toBe(0);
  });
});
