import type { MigrationInterface, QueryRunner } from 'typeorm';

export class AddUserDeletionStatus1791400000000 implements MigrationInterface {
  name = 'AddUserDeletionStatus1791400000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "users" ADD COLUMN "status" varchar(32) NOT NULL DEFAULT 'ACTIVE'`,
    );
    await queryRunner.query(`ALTER TABLE "users" ADD COLUMN "deletion_requested_at" TIMESTAMPTZ`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "users" DROP COLUMN "deletion_requested_at"`);
    await queryRunner.query(`ALTER TABLE "users" DROP COLUMN "status"`);
  }
}
