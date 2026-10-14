import {
  DEV_JWT_SECRET,
  MIN_PRODUCTION_JWT_SECRET_LENGTH,
  resolveJwtSecret,
} from './jwt-secret';

const STRONG = 'x'.repeat(MIN_PRODUCTION_JWT_SECRET_LENGTH);

describe('resolveJwtSecret', () => {
  it.each([undefined, 'development', 'test'])(
    'fuera de producción (%s) usa el de desarrollo si falta',
    (env) => {
      expect(resolveJwtSecret(undefined, env)).toBe(DEV_JWT_SECRET);
      expect(resolveJwtSecret('', env)).toBe(DEV_JWT_SECRET);
    },
  );

  it('fuera de producción respeta el que se defina, aunque sea corto', () => {
    expect(resolveJwtSecret('corto', 'development')).toBe('corto');
  });

  it('en producción acepta un secreto propio suficientemente largo', () => {
    expect(resolveJwtSecret(STRONG, 'production')).toBe(STRONG);
  });

  it.each([undefined, ''])(
    'en producción rechaza un secreto ausente (%p)',
    (v) => {
      expect(() => resolveJwtSecret(v, 'production')).toThrow(/obligatorio/);
    },
  );

  it.each([DEV_JWT_SECRET, 'randomword'])(
    'en producción rechaza el valor de desarrollo conocido (%s)',
    (v) => {
      expect(() => resolveJwtSecret(v, 'production')).toThrow(/conocido/);
    },
  );

  it('en producción rechaza un secreto de 31 caracteres', () => {
    expect(() =>
      resolveJwtSecret(
        'x'.repeat(MIN_PRODUCTION_JWT_SECRET_LENGTH - 1),
        'production',
      ),
    ).toThrow(/al menos 32/);
  });
});
