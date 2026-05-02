import type { MigrationInterface, QueryRunner } from 'typeorm';

export class AddLogoPathToUser1777715959557 implements MigrationInterface {
  name = 'AddLogoPathToUser1777715959557';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "users" RENAME COLUMN "logoPath" TO "logo_path"`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "users" RENAME COLUMN "logo_path" TO "logoPath"`);
  }
}
