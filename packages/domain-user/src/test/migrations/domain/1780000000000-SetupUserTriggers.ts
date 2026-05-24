import { USERS_TRIGGER } from '../../../database/triggers/index.js';
import type { MigrationInterface, QueryRunner } from 'typeorm';

export class SetupUserTriggers1780000000000 implements MigrationInterface {
  name = 'SetupUserTriggers1780000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(USERS_TRIGGER);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TRIGGER IF EXISTS users_created_event_queue_trigger ON users;`);
    await queryRunner.query(
      `DROP FUNCTION IF EXISTS create_user_created_event_queue_record() CASCADE;`,
    );
  }
}
