import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddUserEmailUnique1786642130000 implements MigrationInterface {
  name = 'AddUserEmailUnique1786642130000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Si la tabla ya tiene duplicados de una corrida previa, la constraint falla
    // y la migracion aborta. Es intencional: preferimos enterarnos ahora y
    // decidir que hacer con esos usuarios, antes que perderlos en silencio.
    await queryRunner.query(
      `ALTER TABLE "user" ADD CONSTRAINT "UQ_user_email" UNIQUE ("email")`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "user" DROP CONSTRAINT "UQ_user_email"`,
    );
  }
}
