import { EmailAlreadyRegistered, InvalidEmail } from '../../domain/errors';
import {
  AuthWorld,
  buildAuthWorld,
  PASSWORD,
} from '../testing/auth-test-world';

describe('RegisterUser', () => {
  let w: AuthWorld;
  beforeEach(() => {
    w = buildAuthWorld();
  });

  it('crea el usuario con email en minúsculas', async () => {
    const user = await w.register.execute({
      email: ' Ana@Example.COM ',
      password: PASSWORD,
    });
    expect(user.email.value).toBe('ana@example.com');
    expect(user.createdAt).toEqual(w.clock.now());
    expect(w.users.stored(user.id)).toBeDefined();
  });

  it('guarda el hash y nunca la contraseña en claro', async () => {
    const user = await w.register.execute({
      email: 'ana@example.com',
      password: PASSWORD,
    });
    const stored = w.users.stored(user.id)!;
    expect(stored.passwordHash.value).toBe(`hashed:${PASSWORD}`);
    expect(JSON.stringify(stored)).not.toBe('');
    expect(stored.passwordHash.value).not.toBe(PASSWORD);
  });

  it('email duplicado (distinto casing) lanza EmailAlreadyRegistered sin hashear', async () => {
    await w.register.execute({ email: 'ana@example.com', password: PASSWORD });
    const hashesBefore = w.hasher.hashed.length;
    await expect(
      w.register.execute({ email: 'ANA@example.com', password: PASSWORD }),
    ).rejects.toThrow(EmailAlreadyRegistered);
    expect(w.hasher.hashed.length).toBe(hashesBefore);
    expect(w.users.size).toBe(1);
  });

  it('duplicado por carrera: el chequeo previo pasa pero save lanza', async () => {
    const lookup = jest
      .spyOn(w.users, 'findByEmail')
      .mockResolvedValueOnce(null);
    await w.register.execute({ email: 'ana@example.com', password: PASSWORD });
    lookup.mockResolvedValueOnce(null);
    await expect(
      w.register.execute({ email: 'ana@example.com', password: PASSWORD }),
    ).rejects.toThrow(EmailAlreadyRegistered);
    expect(w.users.size).toBe(1);
  });

  it('email inválido lanza InvalidEmail y no guarda', async () => {
    await expect(
      w.register.execute({ email: 'nope', password: PASSWORD }),
    ).rejects.toThrow(InvalidEmail);
    expect(w.users.size).toBe(0);
    expect(w.hasher.hashed).toHaveLength(0);
  });
});
