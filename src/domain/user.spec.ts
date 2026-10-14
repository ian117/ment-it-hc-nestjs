import { Email } from './email';
import { PasswordHash } from './password-hash';
import { User } from './user';

const T0 = new Date('2026-01-01T10:00:00.000Z');
const T1 = new Date('2026-01-02T10:00:00.000Z');

describe('User', () => {
  const make = () =>
    User.create({
      id: 'u1',
      email: Email.create('ana@example.com'),
      passwordHash: PasswordHash.of('h1'),
      now: T0,
    });

  it('create fija createdAt = updatedAt = now', () => {
    const u = make();
    expect(u.id).toBe('u1');
    expect(u.email.value).toBe('ana@example.com');
    expect(u.passwordHash.value).toBe('h1');
    expect(u.createdAt).toEqual(T0);
    expect(u.updatedAt).toEqual(T0);
  });

  it('changePassword cambia el hash y updatedAt, no createdAt', () => {
    const u = make();
    u.changePassword(PasswordHash.of('h2'), T1);
    expect(u.passwordHash.value).toBe('h2');
    expect(u.updatedAt).toEqual(T1);
    expect(u.createdAt).toEqual(T0);
  });

  it('restore reconstruye sin alias de fechas', () => {
    const u = make();
    const r = User.restore({
      id: u.id,
      email: u.email,
      passwordHash: u.passwordHash,
      createdAt: u.createdAt,
      updatedAt: u.updatedAt,
    });
    expect(r.createdAt).toEqual(T0);
    expect(r.createdAt).not.toBe(u.createdAt);
  });
});
