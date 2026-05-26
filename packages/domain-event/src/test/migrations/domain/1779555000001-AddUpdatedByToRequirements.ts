import type { MigrationInterface, QueryRunner } from 'typeorm';

export class AddUpdatedByToRequirements1779555000001 implements MigrationInterface {
  name = 'AddUpdatedByToRequirements1779555000001';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "requirements" ADD "updatedBy" uuid`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "requirements" DROP COLUMN "updatedBy"`);
  }
}
