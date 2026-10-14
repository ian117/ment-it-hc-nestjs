import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Reemplaza la tabla `notification` (enum, camelCase, metadata json) por
 * `notifications` (diseño 5, ADR-012). Copia los datos existentes en modo
 * best-effort: metadata -> payload.recipient, enum -> varchar, attempts = 0.
 * No toca `user` (el esquema de auth queda para F6/F7).
 */
export class CreateNotificationsTable1786700000000 implements MigrationInterface {
  name = 'CreateNotificationsTable1786700000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "notifications" (
        "id" uuid NOT NULL,
        "user_id" uuid NOT NULL,
        "title" character varying(255) NOT NULL,
        "content" text NOT NULL,
        "channel" character varying(32) NOT NULL,
        "payload" jsonb NOT NULL,
        "status" character varying(16) NOT NULL,
        "attempts" integer NOT NULL DEFAULT 0,
        "error_message" text,
        "sent_at" TIMESTAMP WITH TIME ZONE,
        "created_at" TIMESTAMP WITH TIME ZONE NOT NULL,
        "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL,
        CONSTRAINT "PK_notifications" PRIMARY KEY ("id"),
        CONSTRAINT "CHK_notifications_status" CHECK ("status" IN ('pending', 'sent', 'failed')),
        CONSTRAINT "FK_notifications_user" FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE NO ACTION
      )
    `);
    await queryRunner.query(
      `CREATE INDEX "IDX_notifications_user_created" ON "notifications" ("user_id", "created_at" DESC, "id" DESC)`,
    );

    // Best-effort: los timestamps viejos eran `timestamp` sin zona, escritos
    // por el servidor (now()); se interpretan como UTC.
    await queryRunner.query(`
      INSERT INTO "notifications"
        ("id", "user_id", "title", "content", "channel", "payload", "status",
         "attempts", "error_message", "sent_at", "created_at", "updated_at")
      SELECT
        n."id", n."userId", left(n."title", 255), n."content", n."channel"::text,
        jsonb_build_object('recipient', COALESCE(
          CASE n."channel"::text
            WHEN 'sms' THEN n."metadata"->>'phoneNumber'
            WHEN 'push' THEN n."metadata"->>'deviceToken'
            ELSE COALESCE(n."metadata"->>'to', u."email")
          END, '')),
        n."status"::text, 0, n."errorMessage",
        n."sentAt" AT TIME ZONE 'UTC',
        n."createdAt" AT TIME ZONE 'UTC',
        n."updatedAt" AT TIME ZONE 'UTC'
      FROM "notification" n
      LEFT JOIN "user" u ON u."id" = n."userId"
    `);

    await queryRunner.query(`DROP TABLE "notification"`);
    await queryRunner.query(`DROP TYPE "public"."notification_status_enum"`);
    await queryRunner.query(`DROP TYPE "public"."notification_channel_enum"`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TYPE "public"."notification_channel_enum" AS ENUM('email', 'sms', 'push')`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."notification_status_enum" AS ENUM('pending', 'sent', 'failed')`,
    );
    await queryRunner.query(
      `CREATE TABLE "notification" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "userId" uuid NOT NULL, "title" character varying NOT NULL, "content" character varying NOT NULL, "channel" "public"."notification_channel_enum" NOT NULL, "status" "public"."notification_status_enum" NOT NULL DEFAULT 'pending', "sentAt" TIMESTAMP, "errorMessage" text, "metadata" json, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_705b6c7cdf9b2c2ff7ac7872cb7" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_1ced25315eb974b73391fb1c81" ON "notification" ("userId")`,
    );
    await queryRunner.query(
      `ALTER TABLE "notification" ADD CONSTRAINT "FK_1ced25315eb974b73391fb1c81b" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );

    // Solo vuelven las filas cuyo canal existía en el enum viejo.
    await queryRunner.query(`
      INSERT INTO "notification"
        ("id", "userId", "title", "content", "channel", "status", "sentAt",
         "errorMessage", "metadata", "createdAt", "updatedAt")
      SELECT
        "id", "user_id", "title", "content",
        "channel"::"public"."notification_channel_enum",
        "status"::"public"."notification_status_enum",
        "sent_at" AT TIME ZONE 'UTC',
        "error_message",
        CASE "channel"
          WHEN 'sms' THEN json_build_object('phoneNumber', "payload"->>'recipient')
          WHEN 'push' THEN json_build_object('deviceToken', "payload"->>'recipient')
          ELSE json_build_object('to', "payload"->>'recipient')
        END,
        "created_at" AT TIME ZONE 'UTC',
        "updated_at" AT TIME ZONE 'UTC'
      FROM "notifications"
      WHERE "channel" IN ('email', 'sms', 'push')
    `);

    await queryRunner.query(`DROP TABLE "notifications"`);
  }
}
