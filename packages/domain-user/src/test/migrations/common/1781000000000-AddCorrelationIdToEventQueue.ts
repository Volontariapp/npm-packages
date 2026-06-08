import type { MigrationInterface, QueryRunner } from 'typeorm';

export class AddCorrelationIdToEventQueue1781000000000 implements MigrationInterface {
  name = 'AddCorrelationIdToEventQueue1781000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "event_queue" ADD "correlation_id" uuid NOT NULL DEFAULT uuid_generate_v4()`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_event_queue_correlation_id" ON "event_queue" ("correlation_id")`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX "IDX_event_queue_correlation_id"`);
    await queryRunner.query(`ALTER TABLE "event_queue" DROP COLUMN "correlation_id"`);
  }
}
