import type { MigrationInterface, QueryRunner } from 'typeorm';

export class FixJobAuditStatusTriggerEmitterIdSafe1792000000000 implements MigrationInterface {
  name = 'FixJobAuditStatusTriggerEmitterIdSafe1792000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE OR REPLACE FUNCTION notify_job_audit_status_change()
      RETURNS TRIGGER AS $$
      DECLARE
        stream_prefix text;
        event_type text;
        v_emitter_id uuid;
      BEGIN
        stream_prefix := replace(NEW.emitter, 'ms-', '');
        v_emitter_id := COALESCE(
          CASE
            WHEN NEW.job_id ~ '^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$'
            THEN NEW.job_id::uuid
            ELSE NULL
          END,
          uuid_generate_v4()
        );
        IF NEW.status = 'COMPLETED' THEN
          event_type := stream_prefix || ':job:outbox:success';
          INSERT INTO event_queue (type, emitter, "emitterId", payload, version, updated_at, target_services)
          VALUES (
            event_type,
            NEW.emitter,
            v_emitter_id,
            jsonb_build_object('before', to_jsonb(OLD), 'after', to_jsonb(NEW)),
            1,
            now(),
            ARRAY[event_type]
          );
        ELSIF NEW.status = 'FAILED' THEN
          event_type := stream_prefix || ':job:outbox:failure';
          INSERT INTO event_queue (type, emitter, "emitterId", payload, version, updated_at, target_services)
          VALUES (
            event_type,
            NEW.emitter,
            v_emitter_id,
            jsonb_build_object('before', to_jsonb(OLD), 'after', to_jsonb(NEW)),
            1,
            now(),
            ARRAY[event_type]
          );
        END IF;
        RETURN NEW;
      END;
      $$ LANGUAGE plpgsql;
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE OR REPLACE FUNCTION notify_job_audit_status_change()
      RETURNS TRIGGER AS $$
      DECLARE
        stream_prefix text;
        event_type text;
      BEGIN
        stream_prefix := replace(NEW.emitter, 'ms-', '');
        IF NEW.status = 'COMPLETED' THEN
          event_type := stream_prefix || ':job:outbox:success';
          INSERT INTO event_queue (type, emitter, "emitterId", payload, version, updated_at, target_services)
          VALUES (
            event_type,
            NEW.emitter,
            NEW.job_id::uuid,
            jsonb_build_object('before', to_jsonb(OLD), 'after', to_jsonb(NEW)),
            1,
            now(),
            ARRAY[event_type]
          );
        ELSIF NEW.status = 'FAILED' THEN
          event_type := stream_prefix || ':job:outbox:failure';
          INSERT INTO event_queue (type, emitter, "emitterId", payload, version, updated_at, target_services)
          VALUES (
            event_type,
            NEW.emitter,
            NEW.job_id::uuid,
            jsonb_build_object('before', to_jsonb(OLD), 'after', to_jsonb(NEW)),
            1,
            now(),
            ARRAY[event_type]
          );
        END IF;
        RETURN NEW;
      END;
      $$ LANGUAGE plpgsql;
    `);
  }
}
