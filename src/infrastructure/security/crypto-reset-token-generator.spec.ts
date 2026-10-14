import { CryptoResetTokenGenerator } from './crypto-reset-token-generator';

describe('CryptoResetTokenGenerator', () => {
  const generator = new CryptoResetTokenGenerator();

  it('genera un token hex de 32 bytes y su sha256 de 64 caracteres', () => {
    const { token, tokenHash } = generator.generate();
    expect(token).toMatch(/^[0-9a-f]{64}$/);
    expect(tokenHash).toMatch(/^[0-9a-f]{64}$/);
    expect(tokenHash).not.toBe(token);
    expect(generator.hash(token)).toBe(tokenHash);
  });

  it('cada token es distinto', () => {
    expect(generator.generate().token).not.toBe(generator.generate().token);
  });

  it('hash es sha256 hex conocido', () => {
    expect(generator.hash('abc')).toBe(
      'ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad',
    );
  });
});
