/** Value object: envuelve el hash de una contraseña (nunca la contraseña). */
export class PasswordHash {
  private constructor(readonly value: string) {}

  static of(value: string): PasswordHash {
    if (typeof value !== 'string' || value.length === 0) {
      // Error de programación, no de dominio: un hasher nunca devuelve vacío.
      throw new Error('PasswordHash cannot be empty');
    }
    return new PasswordHash(value);
  }
}
