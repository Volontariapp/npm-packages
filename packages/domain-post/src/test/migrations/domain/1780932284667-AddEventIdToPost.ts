import type { MigrationInterface, QueryRunner } from 'typeorm';

export class AddEventIdToPost1780932284667 implements MigrationInterface {
  name = 'AddEventIdToPost1780932284667';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "posts" ADD "eventId" uuid`);
    await queryRunner.query(
      `CREATE INDEX "IDX_posts_eventId" ON "posts" ("eventId")`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX "public"."IDX_posts_eventId"`);
    await queryRunner.query(`ALTER TABLE "posts" DROP COLUMN "eventId"`);
  }
}
