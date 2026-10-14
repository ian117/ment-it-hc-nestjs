import { InvalidCredentials } from '../../domain/errors';
import {
  AuthWorld,
  buildAuthWorld,
  EMAIL,
  PASSWORD,
} from '../testing/auth-test-world';

describe('Login', () => {
  let w: AuthWorld;
  beforeEach(() => {
    w = buildAuthWorld();
  });

  const registered = () =>
    w.register.execute({ email: EMAIL, password: PASSWORD });

  it('credenciales correctas devuelven el IssuedToken', async () => {
    const user = await registered();
    const issued = await w.login.execute({
      email: 'ANA@example.com',
      password: PASSWORD,
    });
    expect(issued).toEqual({
      accessToken: `token-for-${user.id}`,
      expiresIn: 3600,
    });
  });

  it('contraseña incorrecta es InvalidCredentials', async () => {
    await registered();
    await expect(
      w.login.execute({ email: EMAIL, password: 'otra-cosa' }),
    ).rejects.toThrow(InvalidCredentials);
  });

  it('email inexistente es InvalidCredentials y verifica contra el señuelo', async () => {
    await registered();
    w.hasher.verified.length = 0;
    await expect(
      w.login.execute({ email: 'nadie@example.com', password: PASSWORD }),
    ).rejects.toThrow(InvalidCredentials);
    expect(w.hasher.verified).toHaveLength(1);
    expect(w.hasher.verified[0].hash).toMatch(/^hashed:/);
  });

  it('el señuelo se genera una sola vez', async () => {
    await expect(
      w.login.execute({ email: 'a@example.com', password: PASSWORD }),
    ).rejects.toThrow(InvalidCredentials);
    await expect(
      w.login.execute({ email: 'b@example.com', password: PASSWORD }),
    ).rejects.toThrow(InvalidCredentials);
    expect(w.hasher.hashed).toHaveLength(1);
    expect(w.hasher.verified).toHaveLength(2);
  });

  it('email mal formado es InvalidCredentials, no InvalidEmail', async () => {
    await expect(
      w.login.execute({ email: 'no-es-email', password: PASSWORD }),
    ).rejects.toThrow(InvalidCredentials);
    expect(w.hasher.verified).toHaveLength(1);
  });
});
