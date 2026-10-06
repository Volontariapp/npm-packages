import type { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * The common `jobs_outbox` / `event_queue` migrations default their ids to
 * `uuid_generate_v4()`: the extension must exist before them (domain-post creates it in its
 * first domain migration, hence the timestamp below the common ones).
 */
export class EnableUuidExtension1775000000000 implements MigrationInterface {
  name = 'EnableUuidExtension1775000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`CREATE EXTENSION IF NOT EXISTS "uuid-ossp"`);
  }

  public async down(): Promise<void> {
    // The extension may be shared with other schemas: never dropped.
  }
}
