import type { MigrationInterface, QueryRunner } from 'typeorm';

export class AddSagaStatus1780932284627 implements MigrationInterface {
  name = 'AddSagaStatus1780932284627';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TYPE "public"."events_saga_status_enum" AS ENUM('PENDING', 'DONE', 'CANCEL')`,
    );
    await queryRunner.query(
      `ALTER TABLE "events" ADD "saga_status" "public"."events_saga_status_enum" NOT NULL DEFAULT 'PENDING'`,
    );
    await queryRunner.query(`CREATE INDEX "IDX_events_saga_status" ON "events" ("saga_status")`);
    await queryRunner.query(`UPDATE "events" SET "saga_status" = 'DONE'`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX "public"."IDX_events_saga_status"`);
    await queryRunner.query(`ALTER TABLE "events" DROP COLUMN "saga_status"`);
    await queryRunner.query(`DROP TYPE "public"."events_saga_status_enum"`);
  }
}
