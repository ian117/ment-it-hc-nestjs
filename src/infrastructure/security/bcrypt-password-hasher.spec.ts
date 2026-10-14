import * as bcrypt from 'bcrypt';

import { PasswordHash } from '../../domain/password-hash';
import { BcryptPasswordHasher } from './bcrypt-password-hasher';

describe('BcryptPasswordHasher', () => {
  const hasher = new BcryptPasswordHasher();

  it('verifica la contraseña correcta y rechaza la incorrecta', async () => {
    const hash = await hasher.hash('password123');
    expect(hash.value).toMatch(/^\$2[aby]\$10\$/);
    await expect(hasher.verify('password123', hash)).resolves.toBe(true);
    await expect(hasher.verify('password124', hash)).resolves.toBe(false);
  });

  it('una contraseña de hasta 72 bytes se hashea directo con bcrypt', async () => {
    const plain = 'a'.repeat(72);
    const hash = await hasher.hash(plain);
    await expect(hasher.verify(plain, hash)).resolves.toBe(true);
    await expect(hasher.verify('a'.repeat(71), hash)).resolves.toBe(false);
  });

  it('compatibilidad: un hash bcrypt directo de <= 72 bytes sigue verificando', async () => {
    const legacy = PasswordHash.of(await bcrypt.hash('password123', 10));
    await expect(hasher.verify('password123', legacy)).resolves.toBe(true);
  });

  it('dos contraseñas largas que difieren tras el byte 72 no colisionan', async () => {
    const prefix = 'a'.repeat(72);
    const first = `${prefix}-uno`;
    const second = `${prefix}-dos`;

    const hash = await hasher.hash(first);
    await expect(hasher.verify(first, hash)).resolves.toBe(true);
    await expect(hasher.verify(second, hash)).resolves.toBe(false);
  });

  it('cuenta bytes UTF-8, no caracteres', async () => {
    // 40 caracteres de 2 bytes = 80 bytes; difieren solo en el último.
    const first = 'é'.repeat(39) + 'a';
    const second = 'é'.repeat(39) + 'b';
    const hash = await hasher.hash(first);
    await expect(hasher.verify(first, hash)).resolves.toBe(true);
    await expect(hasher.verify(second, hash)).resolves.toBe(false);
  });

  it('acepta el máximo del contrato (128 caracteres)', async () => {
    const plain = 'p'.repeat(128);
    const hash = await hasher.hash(plain);
    await expect(hasher.verify(plain, hash)).resolves.toBe(true);
  });
});
