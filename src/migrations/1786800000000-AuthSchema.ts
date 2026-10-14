import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Esquema final de auth (diseño 5, ADR-014).
 *
 * - Renombra `"user"` a `users` conservando los datos: columnas a snake_case,
 *   `password` -> `password_hash` (text), `timestamp` -> `timestamptz`
 *   (los valores viejos se interpretan como UTC), varchar(320) para el email
 *   y sin defaults (el id y los timestamps los pone el dominio).
 * - Normaliza el email a minúsculas (así lo busca el dominio), salvo que ya
 *   exista otra fila con ese email normalizado: las filas en conflicto se
 *   dejan intactas (no se pierden usuarios ni aborta la migración).
 * - Descarta `reset_password_token` y `reset_password_expires`: los tokens son
 *   efímeros y ahora viven (hasheados) en `password_reset_tokens`.
 */
export class AuthSchema1786800000000 implements MigrationInterface {
  name = 'AuthSchema1786800000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "notifications" DROP CONSTRAINT "FK_notifications_user"`,
    );

    await queryRunner.query(`ALTER TABLE "user" RENAME TO "users"`);
    await queryRunner.query(
      `ALTER TABLE "users" RENAME CONSTRAINT "PK_cace4a159ff9f2512dd42373760" TO "PK_users"`,
    );
    await queryRunner.query(
      `ALTER TABLE "users" RENAME CONSTRAINT "UQ_user_email" TO "UQ_users_email"`,
    );
    await queryRunner.query(
      `ALTER TABLE "users" RENAME COLUMN "password" TO "password_hash"`,
    );
    await queryRunner.query(
      `ALTER TABLE "users" RENAME COLUMN "createdAt" TO "created_at"`,
    );
    await queryRunner.query(
      `ALTER TABLE "users" RENAME COLUMN "updatedAt" TO "updated_at"`,
    );

    await queryRunner.query(
      `ALTER TABLE "users" DROP COLUMN "reset_password_token"`,
    );
    await queryRunner.query(
      `ALTER TABLE "users" DROP COLUMN "reset_password_expires"`,
    );

    await queryRunner.query(`
      UPDATE "users" u SET "email" = lower(u."email")
      WHERE u."email" <> lower(u."email")
        AND NOT EXISTS (
          SELECT 1 FROM "users" o WHERE o."id" <> u."id" AND o."email" = lower(u."email")
        )
    `);
    await queryRunner.query(
      `ALTER TABLE "users" ALTER COLUMN "email" TYPE character varying(320)`,
    );
    await queryRunner.query(
      `ALTER TABLE "users" ALTER COLUMN "password_hash" TYPE text`,
    );
    await queryRunner.query(
      `ALTER TABLE "users" ALTER COLUMN "id" DROP DEFAULT`,
    );
    for (const column of ['created_at', 'updated_at']) {
      await queryRunner.query(
        `ALTER TABLE "users" ALTER COLUMN "${column}" DROP DEFAULT`,
      );
      await queryRunner.query(
        `ALTER TABLE "users" ALTER COLUMN "${column}" TYPE TIMESTAMP WITH TIME ZONE USING "${column}" AT TIME ZONE 'UTC'`,
      );
    }

    await queryRunner.query(
      `ALTER TABLE "notifications" ADD CONSTRAINT "FK_notifications_user" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );

    await queryRunner.query(`
      CREATE TABLE "password_reset_tokens" (
        "id" uuid NOT NULL,
        "user_id" uuid NOT NULL,
        "token_hash" character(64) NOT NULL,
        "expires_at" TIMESTAMP WITH TIME ZONE NOT NULL,
        "used_at" TIMESTAMP WITH TIME ZONE,
        "created_at" TIMESTAMP WITH TIME ZONE NOT NULL,
        CONSTRAINT "PK_password_reset_tokens" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_password_reset_tokens_token_hash" UNIQUE ("token_hash"),
        CONSTRAINT "FK_password_reset_tokens_user" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION
      )
    `);
  }

  /**
   * Revierte el esquema conservando usuarios. Los tokens de reseteo se
   * pierden (eran efímeros) y las columnas de reseteo vuelven en NULL.
   */
  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "password_reset_tokens"`);
    await queryRunner.query(
      `ALTER TABLE "notifications" DROP CONSTRAINT "FK_notifications_user"`,
    );

    for (const [from, to] of [
      ['created_at', 'createdAt'],
      ['updated_at', 'updatedAt'],
    ]) {
      await queryRunner.query(
        `ALTER TABLE "users" ALTER COLUMN "${from}" TYPE TIMESTAMP USING "${from}" AT TIME ZONE 'UTC'`,
      );
      await queryRunner.query(
        `ALTER TABLE "users" ALTER COLUMN "${from}" SET DEFAULT now()`,
      );
      await queryRunner.query(
        `ALTER TABLE "users" RENAME COLUMN "${from}" TO "${to}"`,
      );
    }
    await queryRunner.query(
      `ALTER TABLE "users" ALTER COLUMN "id" SET DEFAULT uuid_generate_v4()`,
    );
    await queryRunner.query(
      `ALTER TABLE "users" ALTER COLUMN "password_hash" TYPE character varying`,
    );
    await queryRunner.query(
      `ALTER TABLE "users" ALTER COLUMN "email" TYPE character varying`,
    );
    await queryRunner.query(
      `ALTER TABLE "users" RENAME COLUMN "password_hash" TO "password"`,
    );
    await queryRunner.query(
      `ALTER TABLE "users" ADD "reset_password_token" character varying`,
    );
    await queryRunner.query(
      `ALTER TABLE "users" ADD "reset_password_expires" TIMESTAMP`,
    );
    await queryRunner.query(
      `ALTER TABLE "users" RENAME CONSTRAINT "UQ_users_email" TO "UQ_user_email"`,
    );
    await queryRunner.query(
      `ALTER TABLE "users" RENAME CONSTRAINT "PK_users" TO "PK_cace4a159ff9f2512dd42373760"`,
    );
    await queryRunner.query(`ALTER TABLE "users" RENAME TO "user"`);

    await queryRunner.query(
      `ALTER TABLE "notifications" ADD CONSTRAINT "FK_notifications_user" FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
  }
}
