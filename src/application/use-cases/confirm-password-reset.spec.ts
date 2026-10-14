import { InvalidResetToken } from '../../domain/errors';
import { PasswordHash } from '../../domain/password-hash';
import { PasswordResetToken } from '../../domain/password-reset-token';
import {
  AuthWorld,
  buildAuthWorld,
  EMAIL,
  PASSWORD,
  RESET_TTL_MINUTES,
} from '../testing/auth-test-world';

describe('ConfirmPasswordReset', () => {
  let w: AuthWorld;
  let userId: string;
  let token: string;

  beforeEach(async () => {
    w = buildAuthWorld();
    userId = (await w.register.execute({ email: EMAIL, password: PASSWORD }))
      .id;
    token = (await w.requestReset.execute({ email: EMAIL }))!;
  });

  const currentHash = () => w.users.stored(userId)!.passwordHash.value;
  const originalHash = `hashed:${PASSWORD}`;

  it('cambia la contraseña y marca usedAt', async () => {
    w.clock.advance(60_000);
    await w.confirmReset.execute({ token, newPassword: 'nueva-clave-123' });

    expect(currentHash()).toBe('hashed:nueva-clave-123');
    expect(w.users.stored(userId)!.updatedAt).toEqual(w.clock.now());
    expect(w.resetTokens.all()[0].usedAt).toEqual(w.clock.now());
    // y el login funciona con la nueva
    await expect(
      w.login.execute({ email: EMAIL, password: 'nueva-clave-123' }),
    ).resolves.toBeDefined();
  });

  it('segunda confirmación lanza InvalidResetToken y no cambia la contraseña', async () => {
    await w.confirmReset.execute({ token, newPassword: 'primera-clave-1' });
    await expect(
      w.confirmReset.execute({ token, newPassword: 'segunda-clave-2' }),
    ).rejects.toThrow(InvalidResetToken);
    expect(currentHash()).toBe('hashed:primera-clave-1');
  });

  it('token vencido (borde exacto de expiresAt)', async () => {
    w.clock.advance(RESET_TTL_MINUTES * 60_000);
    await expect(
      w.confirmReset.execute({ token, newPassword: 'nueva-clave-123' }),
    ).rejects.toThrow(InvalidResetToken);
    expect(currentHash()).toBe(originalHash);
    expect(w.resetTokens.all()[0].usedAt).toBeNull();
  });

  it('un instante antes de vencer aún sirve', async () => {
    w.clock.advance(RESET_TTL_MINUTES * 60_000 - 1);
    await w.confirmReset.execute({ token, newPassword: 'nueva-clave-123' });
    expect(currentHash()).toBe('hashed:nueva-clave-123');
  });

  it('token inexistente', async () => {
    await expect(
      w.confirmReset.execute({ token: 'otro', newPassword: 'nueva-clave-123' }),
    ).rejects.toThrow(InvalidResetToken);
    expect(currentHash()).toBe(originalHash);
  });

  it('carrera: otro consume entre la lectura y consume() -> InvalidResetToken', async () => {
    const hasher = w.hasher;
    const realHash = (plain: string) => PasswordHash.of(`hashed:${plain}`);
    jest.spyOn(hasher, 'hash').mockImplementationOnce(async (plain) => {
      // La otra petición gana la carrera mientras esta hashea.
      const rival = (await w.resetTokens.findByHash(w.generator.hash(token)))!;
      rival.markUsed(w.clock.now());
      await expect(w.resetTokens.consume(rival)).resolves.toBe(true);
      return realHash(plain);
    });

    await expect(
      w.confirmReset.execute({ token, newPassword: 'nueva-clave-123' }),
    ).rejects.toThrow(InvalidResetToken);
    expect(currentHash()).toBe(originalHash);
  });

  it('consume devuelve false: la contraseña NO cambia', async () => {
    jest.spyOn(w.resetTokens, 'consume').mockResolvedValueOnce(false);
    const saves = w.users.saveCount;
    await expect(
      w.confirmReset.execute({ token, newPassword: 'nueva-clave-123' }),
    ).rejects.toThrow(InvalidResetToken);
    expect(currentHash()).toBe(originalHash);
    expect(w.users.saveCount).toBe(saves);
  });

  it('el repo fake consume es atómico: la segunda vez devuelve false', async () => {
    const t = (await w.resetTokens.findByHash(w.generator.hash(token)))!;
    t.markUsed(w.clock.now());
    expect(await w.resetTokens.consume(t)).toBe(true);
    expect(await w.resetTokens.consume(t)).toBe(false);
  });

  it('usuario inexistente para un token válido: InvalidResetToken', async () => {
    await w.resetTokens.save(
      PasswordResetToken.create({
        id: 'orphan',
        userId: 'ghost',
        tokenHash: w.generator.hash('huerfano'),
        expiresAt: new Date(w.clock.now().getTime() + 60_000),
        now: w.clock.now(),
      }),
    );
    await expect(
      w.confirmReset.execute({
        token: 'huerfano',
        newPassword: 'nueva-clave-123',
      }),
    ).rejects.toThrow(InvalidResetToken);
  });
});
