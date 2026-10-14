/** Secreto de desarrollo: público, solo se usa fuera de producción. */
export const DEV_JWT_SECRET = 'dev-only-insecure-secret-change-me';

/** Longitud mínima en producción (HS256 pide al menos 256 bits). */
export const MIN_PRODUCTION_JWT_SECRET_LENGTH = 32;

/** Valores conocidos que nunca son válidos en producción. */
const KNOWN_INSECURE = new Set([DEV_JWT_SECRET, 'randomword']);

/**
 * Secreto de firma de los JWT (ADR-015). Fuera de producción cae en el valor
 * de desarrollo; en producción exige uno propio (definido, de al menos 32
 * caracteres y que no sea un valor conocido) y, si no, la app no arranca.
 */
export function resolveJwtSecret(
  secret: string | undefined,
  nodeEnv: string | undefined,
): string {
  if (nodeEnv !== 'production') return secret || DEV_JWT_SECRET;

  if (!secret) {
    throw new Error('JWT_SECRET es obligatorio en producción (ADR-015).');
  }
  if (KNOWN_INSECURE.has(secret)) {
    throw new Error(
      'JWT_SECRET es un valor de desarrollo conocido; define uno propio en producción (ADR-015).',
    );
  }
  if (secret.length < MIN_PRODUCTION_JWT_SECRET_LENGTH) {
    throw new Error(
      `JWT_SECRET debe tener al menos ${MIN_PRODUCTION_JWT_SECRET_LENGTH} caracteres en producción (ADR-015).`,
    );
  }
  return secret;
}
