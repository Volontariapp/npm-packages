import type { MigrationInterface, QueryRunner } from 'typeorm';

export class AddUpdatedByToTags1779555000000 implements MigrationInterface {
  name = 'AddUpdatedByToTags1779555000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "tags" ADD "updatedBy" uuid`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "tags" DROP COLUMN "updatedBy"`);
  }
}
