import { MigrationInterface, QueryRunner } from "typeorm";

export class UserNotifications1785520120146 implements MigrationInterface {
    name = 'UserNotifications1785520120146'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE "user" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "email" character varying NOT NULL, "password" character varying NOT NULL, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_cace4a159ff9f2512dd42373760" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TYPE "public"."notification_channel_enum" AS ENUM('email', 'sms', 'push')`);
        await queryRunner.query(`CREATE TYPE "public"."notification_status_enum" AS ENUM('pending', 'sent', 'failed')`);
        await queryRunner.query(`CREATE TABLE "notification" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "userId" uuid NOT NULL, "title" character varying NOT NULL, "content" character varying NOT NULL, "channel" "public"."notification_channel_enum" NOT NULL, "status" "public"."notification_status_enum" NOT NULL, "sentAt" TIMESTAMP, "metadata" json, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_705b6c7cdf9b2c2ff7ac7872cb7" PRIMARY KEY ("id"))`);
        await queryRunner.query(`ALTER TABLE "notification" ADD CONSTRAINT "FK_1ced25315eb974b73391fb1c81b" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "notification" DROP CONSTRAINT "FK_1ced25315eb974b73391fb1c81b"`);
        await queryRunner.query(`DROP TABLE "notification"`);
        await queryRunner.query(`DROP TYPE "public"."notification_status_enum"`);
        await queryRunner.query(`DROP TYPE "public"."notification_channel_enum"`);
        await queryRunner.query(`DROP TABLE "user"`);
    }

}
