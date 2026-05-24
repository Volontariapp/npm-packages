import {
  EVENTS_TRIGGER,
  REQUIREMENTS_TRIGGER,
  TAGS_TRIGGER,
  EVENT_TAGS_TRIGGER,
} from '@volontariapp/domain-event';

import type { MigrationInterface, QueryRunner } from 'typeorm';

export class SetupEventTriggers1776786226146 implements MigrationInterface {
  name = 'SetupEventTriggers1776786226146';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE OR REPLACE FUNCTION create_event_queue_record()
      RETURNS TRIGGER AS $$
      BEGIN
          IF (TG_OP = 'DELETE') THEN
              INSERT INTO event_queue (type, emitter, payload, version, updated_at)
              VALUES (TG_ARGV[0], TG_ARGV[1], jsonb_build_object('before', to_jsonb(OLD), 'after', NULL), 1, now());
              RETURN OLD;
          ELSIF (TG_OP = 'INSERT') THEN
              INSERT INTO event_queue (type, emitter, payload, version, updated_at)
              VALUES (TG_ARGV[0], TG_ARGV[1], jsonb_build_object('before', NULL, 'after', to_jsonb(NEW)), 1, now());
              RETURN NEW;
          ELSE -- UPDATE
              INSERT INTO event_queue (type, emitter, payload, version, updated_at)
              VALUES (TG_ARGV[0], TG_ARGV[1], jsonb_build_object('before', to_jsonb(OLD), 'after', to_jsonb(NEW)), 1, now());
              RETURN NEW;
          END IF;
      END;
      $$ LANGUAGE plpgsql;
    `);
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
    await queryRunner.query(`DROP TRIGGER IF EXISTS event_tags_event_queue_trigger ON event_tags;`);
    await queryRunner.query(`DROP FUNCTION IF EXISTS create_event_queue_record() CASCADE;`);
  }
}
