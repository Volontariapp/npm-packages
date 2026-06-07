import type { MigrationInterface, QueryRunner } from 'typeorm';

export class InitialCommentSchema1780000000000 implements MigrationInterface {
  name = 'InitialCommentSchema1780000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE "comments" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "postId" uuid NOT NULL, "authorId" uuid NOT NULL, "content" character varying(1000) NOT NULL, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_comments_id" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(`CREATE INDEX "IDX_comments_postId" ON "comments" ("postId")`);
    await queryRunner.query(`CREATE INDEX "IDX_comments_authorId" ON "comments" ("authorId")`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX "public"."IDX_comments_authorId"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_comments_postId"`);
    await queryRunner.query(`DROP TABLE "comments"`);
  }
}
