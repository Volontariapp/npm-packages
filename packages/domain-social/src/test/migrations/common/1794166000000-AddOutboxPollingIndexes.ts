import type { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * The outbox runners poll `WHERE status = 'PENDING' ORDER BY created_at, id LIMIT n` and purge
 * the COMPLETED rows by age. Without an index each poll read the whole table, which saturated the
 * disk once the COMPLETED rows had piled up (ms-ranking: 365 MB read several times per second).
 *
 * The index is built inside the migration transaction (not CONCURRENTLY): TypeORM refuses a
 * migration that opts out of the transaction when the data source runs all migrations in one
 * transaction, which is the default. The outbox tables are small (the runners purge them), so the
 * write lock lasts milliseconds.
 */
export class AddOutboxPollingIndexes1794166000000 implements MigrationInterface {
  name = 'AddOutboxPollingIndexes1794166000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_event_queue_status_created_at" ON "event_queue" ("status", "created_at", "id")`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_jobs_outbox_status_created_at" ON "jobs_outbox" ("status", "created_at", "id")`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_jobs_outbox_status_created_at"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_event_queue_status_created_at"`);
  }
}
