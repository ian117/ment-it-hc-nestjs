import { config } from 'dotenv';
import { DataSource } from 'typeorm';

import { CreatePgExtensions1785200000000 } from './../src/migrations/1785200000000-CreatePgExtensions';
import { UserNotifications1785728204530 } from './../src/migrations/1785728204530-UserNotifications';
import { AddUserEmailUnique1786642130000 } from './../src/migrations/1786642130000-AddUserEmailUnique';
import { AddNotificationErrorMessage1786642140000 } from './../src/migrations/1786642140000-AddNotificationErrorMessage';
import { CreateNotificationsTable1786700000000 } from './../src/migrations/1786700000000-CreateNotificationsTable';
import { AuthSchema1786800000000 } from './../src/migrations/1786800000000-AuthSchema';

config({ quiet: true });

const MIGRATIONS = [
  CreatePgExtensions1785200000000,
  UserNotifications1785728204530,
  AddUserEmailUnique1786642130000,
  AddNotificationErrorMessage1786642140000,
  CreateNotificationsTable1786700000000,
  AuthSchema1786800000000,
];

const connection = (database: string) => ({
  type: 'postgres' as const,
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT ?? '5432', 10) || 5432,
  username: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database,
});

/**
 * Corre la migración AuthSchema (up y down) sobre datos del esquema viejo, en
 * una base descartable para no tocar la de desarrollo.
 */
describe('migración AuthSchema (e2e)', () => {
  const dbName = `migration_test_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
  let admin: DataSource;
  let db: DataSource;

  const q = <T = Record<string, unknown>>(
    sql: string,
    params: unknown[] = [],
  ) => db.query<T[]>(sql, params);

  beforeAll(async () => {
    admin = await new DataSource(
      connection(process.env.DB_NAME as string),
    ).initialize();
    await admin.query(`CREATE DATABASE "${dbName}"`);
    db = await new DataSource({
      ...connection(dbName),
      migrations: MIGRATIONS,
      migrationsTransactionMode: 'each',
    }).initialize();

    // Esquema anterior a AuthSchema, con datos reales de la forma vieja.
    await db.runMigrations();
    await db.undoLastMigration();
  });

  afterAll(async () => {
    await db?.destroy();
    await admin.query(`DROP DATABASE IF EXISTS "${dbName}" WITH (FORCE)`);
    await admin.destroy();
  });

  it('up conserva usuarios, normaliza emails sin chocar y deja el esquema final', async () => {
    const ids = {
      mixed: '11111111-1111-4111-8111-111111111111',
      lower: '22222222-2222-4222-8222-222222222222',
      clashLower: '33333333-3333-4333-8333-333333333333',
      clashUpper: '44444444-4444-4444-8444-444444444444',
    };
    await q(
      `INSERT INTO "user"(id, email, password, reset_password_token, "createdAt", "updatedAt") VALUES
       ($1, 'Mixed@Case.com', 'h1', 'tok', '2026-01-02 03:04:05', '2026-01-02 03:04:05'),
       ($2, 'lower@case.com', 'h2', NULL, '2026-01-02 03:04:05', '2026-01-02 03:04:05'),
       ($3, 'clash@case.com', 'h3', NULL, now(), now()),
       ($4, 'CLASH@case.com', 'h4', NULL, now(), now())`,
      [ids.mixed, ids.lower, ids.clashLower, ids.clashUpper],
    );
    await q(
      `INSERT INTO notifications(id, user_id, title, content, channel, payload, status, created_at, updated_at)
       VALUES ('55555555-5555-4555-8555-555555555555', $1, 't', 'c', 'sms', '{"recipient":"+5219611234567"}', 'sent', now(), now())`,
      [ids.mixed],
    );

    await db.runMigrations();

    const users = await q<{ id: string; email: string; password_hash: string }>(
      `SELECT id, email, password_hash FROM users ORDER BY id`,
    );
    expect(users).toEqual([
      { id: ids.mixed, email: 'mixed@case.com', password_hash: 'h1' },
      { id: ids.lower, email: 'lower@case.com', password_hash: 'h2' },
      { id: ids.clashLower, email: 'clash@case.com', password_hash: 'h3' },
      // En conflicto con otro ya normalizado: se deja intacto, no se pierde.
      { id: ids.clashUpper, email: 'CLASH@case.com', password_hash: 'h4' },
    ]);

    const [created] = await q<{ created_at: Date }>(
      `SELECT created_at FROM users WHERE id = $1`,
      [ids.mixed],
    );
    expect(created.created_at.toISOString()).toBe('2026-01-02T03:04:05.000Z');

    const cols = await q<{
      table_name: string;
      column_name: string;
      column_default: string | null;
    }>(
      `SELECT table_name, column_name, column_default FROM information_schema.columns
       WHERE table_name IN ('users', 'password_reset_tokens')`,
    );
    expect(cols.filter((c) => c.column_default !== null)).toEqual([]);
    const userCols = cols
      .filter((c) => c.table_name === 'users')
      .map((c) => c.column_name)
      .sort();
    expect(userCols).toEqual([
      'created_at',
      'email',
      'id',
      'password_hash',
      'updated_at',
    ]);

    // La FK de notifications sigue apuntando a users con cascade.
    await q(`DELETE FROM users WHERE id = $1`, [ids.mixed]);
    expect(await q(`SELECT 1 FROM notifications`)).toHaveLength(0);
  });

  it('down restaura el esquema viejo conservando usuarios y sus defaults', async () => {
    await db.undoLastMigration();

    const users = await q<{ email: string; password: string }>(
      `SELECT email, password FROM "user" ORDER BY email`,
    );
    expect(users.map((u) => u.email)).toEqual([
      'CLASH@case.com',
      'clash@case.com',
      'lower@case.com',
    ]);
    const defaults = await q<{ column_name: string; column_default: string }>(
      `SELECT column_name, column_default FROM information_schema.columns
       WHERE table_name = 'user' AND column_default IS NOT NULL`,
    );
    expect(defaults.map((d) => d.column_name).sort()).toEqual([
      'createdAt',
      'id',
      'updatedAt',
    ]);
    expect(await q(`SELECT to_regclass('password_reset_tokens') AS t`)).toEqual(
      [{ t: null }],
    );

    // Y vuelve a subir sin errores.
    await db.runMigrations();
    expect(await q(`SELECT 1 FROM users`)).toHaveLength(3);
  });
});
