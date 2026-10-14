import type { MigrationInterface, QueryRunner } from 'typeorm';

export class AddCoverFileAndStatusToEvent1781000000000 implements MigrationInterface {
  name = 'AddCoverFileAndStatusToEvent1781000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TYPE "public"."events_cover_status_enum" AS ENUM('0', '1', '2', '3', '4', '-1')`,
    );
    await queryRunner.query(`ALTER TABLE "events" ADD "cover_file_id" uuid NULL`);
    await queryRunner.query(
      `ALTER TABLE "events" ADD "cover_status" "public"."events_cover_status_enum" NOT NULL DEFAULT '1'`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "events" DROP COLUMN "cover_status"`);
    await queryRunner.query(`ALTER TABLE "events" DROP COLUMN "cover_file_id"`);
    await queryRunner.query(`DROP TYPE "public"."events_cover_status_enum"`);
  }
}
