import type { MigrationInterface, QueryRunner } from 'typeorm';

export class FixEventQueueStatusDefault1779360000000 implements MigrationInterface {
  name = 'FixEventQueueStatusDefault1779360000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "event_queue" ALTER COLUMN "status" SET DEFAULT 'PENDING'`,
    );
    await queryRunner.query(
      `ALTER TABLE "jobs_outbox" ALTER COLUMN "status" SET DEFAULT 'PENDING'`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "jobs_outbox" ALTER COLUMN "status" DROP DEFAULT`);
    await queryRunner.query(`ALTER TABLE "event_queue" ALTER COLUMN "status" DROP DEFAULT`);
  }
}
