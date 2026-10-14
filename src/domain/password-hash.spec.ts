import { PasswordHash } from './password-hash';

describe('PasswordHash', () => {
  it('expone el valor', () => {
    expect(PasswordHash.of('$2b$10$abc').value).toBe('$2b$10$abc');
  });

  it('vacío es un error de programación', () => {
    expect(() => PasswordHash.of('')).toThrow(Error);
  });
});
