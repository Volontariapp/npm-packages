import type { MigrationInterface, QueryRunner } from 'typeorm';

export class JobsOutboxAndEventQueueWithTraceId1776975278062 implements MigrationInterface {
  name = 'JobsOutboxAndEventQueueWithTraceId1776975278062';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "event_queue" ADD "traceId" uuid`);
    await queryRunner.query(`ALTER TABLE "jobs_outbox" ADD "traceId" uuid`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "jobs_outbox" DROP COLUMN "traceId"`);
    await queryRunner.query(`ALTER TABLE "event_queue" DROP COLUMN "traceId"`);
  }
}
