import {
  EVENT_QUEUE_TRIGGER_FUNCTION,
  EVENTS_TRIGGER,
  REQUIREMENTS_TRIGGER,
  TAGS_TRIGGER,
  EVENT_TAGS_TRIGGER,
} from '../../database/triggers/index.js';

import type { MigrationInterface, QueryRunner } from 'typeorm';

export class SetupEventTriggers1776786226146 implements MigrationInterface {
  name = 'SetupEventTriggers1776786226146';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(EVENT_QUEUE_TRIGGER_FUNCTION);
    await queryRunner.query(EVENTS_TRIGGER);
    await queryRunner.query(REQUIREMENTS_TRIGGER);
    await queryRunner.query(TAGS_TRIGGER);
    await queryRunner.query(EVENT_TAGS_TRIGGER);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TRIGGER IF EXISTS tags_event_queue_trigger ON tags;`);
    await queryRunner.query(
      `DROP TRIGGER IF EXISTS requirements_event_queue_trigger ON requirements;`,
    );
    await queryRunner.query(`DROP TRIGGER IF EXISTS events_event_queue_trigger ON events;`);
    await queryRunner.query(`DROP FUNCTION IF EXISTS create_event_queue_record();`);
  }
}
