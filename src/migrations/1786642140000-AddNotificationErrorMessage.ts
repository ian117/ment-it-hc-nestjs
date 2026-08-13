import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddNotificationErrorMessage1786642140000 implements MigrationInterface {
  name = 'AddNotificationErrorMessage1786642140000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "notification" ADD "errorMessage" text`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "notification" DROP COLUMN "errorMessage"`,
    );
  }
}
