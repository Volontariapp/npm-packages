import type { MigrationInterface, QueryRunner } from 'typeorm';

export class AddDetailsToRequirement1776104175000 implements MigrationInterface {
  name = 'AddDetailsToRequirement1776104175000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "requirements" ADD "description" text`);
    await queryRunner.query(
      `ALTER TABLE "requirements" ADD "currentQuantity" integer NOT NULL DEFAULT 0`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "requirements" DROP COLUMN "currentQuantity"`);
    await queryRunner.query(`ALTER TABLE "requirements" DROP COLUMN "description"`);
  }
}
