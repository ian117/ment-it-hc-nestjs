import { resolveJwtSecret } from './jwt-secret';

function positiveInt(raw: string | undefined, fallback: number): number {
  const value = parseInt(raw ?? '', 10);
  return Number.isInteger(value) && value > 0 ? value : fallback;
}

export default () => ({
  nodeEnv: process.env.NODE_ENV ?? 'development',
  port: parseInt(process.env.PORT ?? '3000', 10) || 3000,
  database: {
    host: process.env.DB_HOST,
    port: parseInt(process.env.DB_PORT ?? '5432', 10) || 5432,
    name: process.env.DB_NAME,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
  },
  jwt: {
    secret: resolveJwtSecret(process.env.JWT_SECRET, process.env.NODE_ENV),
    expiresInSeconds: positiveInt(process.env.JWT_EXPIRES_IN_SECONDS, 3600),
  },
  resetTokenExpiresMinutes: positiveInt(
    process.env.RESET_TOKEN_EXPIRES_MINUTES,
    15,
  ),
});
