import type { MigrationInterface, QueryRunner } from 'typeorm';

export class AddUniqueConstraintToPostTitle1776000000001 implements MigrationInterface {
  name = 'AddUniqueConstraintToPostTitle1776000000001';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "posts" ADD CONSTRAINT "UQ_posts_title" UNIQUE ("title")`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "posts" DROP CONSTRAINT "UQ_posts_title"`);
  }
}
