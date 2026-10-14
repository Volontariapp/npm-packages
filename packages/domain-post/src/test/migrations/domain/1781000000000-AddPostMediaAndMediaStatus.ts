import type { MigrationInterface, QueryRunner } from 'typeorm';

export class AddPostMediaAndMediaStatus1781000000000 implements MigrationInterface {
  name = 'AddPostMediaAndMediaStatus1781000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "posts" ADD "media_status" varchar(32) NOT NULL DEFAULT 'NONE'`,
    );
    await queryRunner.query(`CREATE INDEX "IDX_posts_media_status" ON "posts" ("media_status")`);

    await queryRunner.query(`
      CREATE TABLE "post_media" (
        "id" uuid PRIMARY KEY,
        "post_id" uuid NOT NULL,
        "file_id" uuid NOT NULL,
        "position" integer NOT NULL DEFAULT 0,
        "scan_status" varchar(32) NOT NULL DEFAULT 'AWAITING_UPLOAD',
        CONSTRAINT "FK_post_media_post" FOREIGN KEY ("post_id") REFERENCES "posts"("id") ON DELETE CASCADE
      )
    `);
    await queryRunner.query(`CREATE INDEX "idx_post_media_post" ON "post_media" ("post_id")`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "post_media"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_posts_media_status"`);
    await queryRunner.query(`ALTER TABLE "posts" DROP COLUMN "media_status"`);
  }
}
