import type { MigrationInterface, QueryRunner } from 'typeorm';

export class AddTraceparentToJobsOutboxAndEventQueue1791900000000 implements MigrationInterface {
  name = 'AddTraceparentToJobsOutboxAndEventQueue1791900000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "event_queue" ADD "traceparent" character varying(55)`);
    await queryRunner.query(`ALTER TABLE "jobs_outbox" ADD "traceparent" character varying(55)`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "jobs_outbox" DROP COLUMN "traceparent"`);
    await queryRunner.query(`ALTER TABLE "event_queue" DROP COLUMN "traceparent"`);
  }
}
