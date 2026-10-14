import { Email, MAX_EMAIL_LENGTH } from './email';
import { InvalidEmail } from './errors';

describe('Email', () => {
  it('normaliza con trim y minúsculas', () => {
    expect(Email.create('  Ana@Example.COM ').value).toBe('ana@example.com');
  });

  it.each(['', 'sin-arroba', 'a@b', 'a b@c.com', '@c.com', 'a@@c.com'])(
    'rechaza %p',
    (raw) => {
      expect(() => Email.create(raw)).toThrow(InvalidEmail);
    },
  );

  it('respeta el máximo de longitud', () => {
    const suffix = '@x.com';
    const ok = 'a'.repeat(MAX_EMAIL_LENGTH - suffix.length) + suffix;
    expect(Email.create(ok).value).toHaveLength(MAX_EMAIL_LENGTH);
    expect(() => Email.create('a' + ok)).toThrow(InvalidEmail);
  });

  it('equals compara por valor normalizado', () => {
    expect(Email.create('A@b.com').equals(Email.create('a@B.com'))).toBe(true);
    expect(Email.create('a@b.com').equals(Email.create('c@b.com'))).toBe(false);
  });
});
