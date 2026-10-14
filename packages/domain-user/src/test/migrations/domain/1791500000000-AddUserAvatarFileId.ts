import type { MigrationInterface, QueryRunner } from 'typeorm';

export class AddUserAvatarFileId1791500000000 implements MigrationInterface {
  name = 'AddUserAvatarFileId1791500000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "users" ADD COLUMN "avatar_file_id" uuid`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "users" DROP COLUMN "avatar_file_id"`);
  }
}
