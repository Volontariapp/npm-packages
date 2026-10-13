import type { MigrationInterface, QueryRunner } from 'typeorm';

export class UpdateEventQueueTriggerTargetService1779700000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE OR REPLACE FUNCTION create_event_queue_record()
      RETURNS TRIGGER AS $$
      DECLARE
          event_type TEXT := TG_ARGV[0];
          emitter_name TEXT := TG_ARGV[1];
          payload_data JSONB;
          v_emitter_id UUID;
          v_event_id UUID;
      BEGIN
          IF (TG_OP = 'DELETE') THEN
              payload_data := jsonb_build_object('before', to_jsonb(OLD), 'after', NULL);
          ELSIF (TG_OP = 'INSERT') THEN
              payload_data := jsonb_build_object('before', NULL, 'after', to_jsonb(NEW));
          ELSIF (TG_OP = 'UPDATE') THEN
              payload_data := jsonb_build_object('before', to_jsonb(OLD), 'after', to_jsonb(NEW));
          END IF;

          v_emitter_id := COALESCE(
              (payload_data->'after'->>'updatedBy')::UUID,
              (payload_data->'after'->>'organizerId')::UUID,
              (payload_data->'after'->>'createdBy')::UUID,
              (payload_data->'before'->>'updatedBy')::UUID,
              (payload_data->'before'->>'organizerId')::UUID,
              (payload_data->'before'->>'createdBy')::UUID
          );

          IF v_emitter_id IS NULL THEN
              v_event_id := COALESCE(
                  (payload_data->'after'->>'eventsId')::UUID,
                  (payload_data->'before'->>'eventsId')::UUID
              );
              IF v_event_id IS NOT NULL THEN
                  SELECT "organizerId" INTO v_emitter_id FROM events WHERE id = v_event_id;
              END IF;
          END IF;

          IF v_emitter_id IS NULL THEN
              v_emitter_id := uuid_generate_v4();
          END IF;

          INSERT INTO event_queue (
              type,
              emitter,
              "emitterId",
              payload,
              target_services,
              version,
              status,
              attempts,
              updated_at,
              created_at
          ) VALUES (
              event_type,
              emitter_name,
              v_emitter_id,
              payload_data,
              ARRAY['social:interactions'],
              1,
              'PENDING',
              0,
              now(),
              now()
          );

          IF (TG_OP = 'DELETE') THEN
              RETURN OLD;
          END IF;
          RETURN NEW;
      END;
      $$ LANGUAGE plpgsql;
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE OR REPLACE FUNCTION create_event_queue_record()
      RETURNS TRIGGER AS $$
      DECLARE
          event_type TEXT := TG_ARGV[0];
          emitter_name TEXT := TG_ARGV[1];
          payload_data JSONB;
          v_emitter_id UUID;
          v_event_id UUID;
      BEGIN
          IF (TG_OP = 'DELETE') THEN
              payload_data := jsonb_build_object('before', to_jsonb(OLD), 'after', NULL);
          ELSIF (TG_OP = 'INSERT') THEN
              payload_data := jsonb_build_object('before', NULL, 'after', to_jsonb(NEW));
          ELSIF (TG_OP = 'UPDATE') THEN
              payload_data := jsonb_build_object('before', to_jsonb(OLD), 'after', to_jsonb(NEW));
          END IF;

          v_emitter_id := COALESCE(
              (payload_data->'after'->>'updatedBy')::UUID,
              (payload_data->'after'->>'organizerId')::UUID,
              (payload_data->'after'->>'createdBy')::UUID,
              (payload_data->'before'->>'updatedBy')::UUID,
              (payload_data->'before'->>'organizerId')::UUID,
              (payload_data->'before'->>'createdBy')::UUID
          );

          IF v_emitter_id IS NULL THEN
              v_event_id := COALESCE(
                  (payload_data->'after'->>'eventsId')::UUID,
                  (payload_data->'before'->>'eventsId')::UUID
              );
              IF v_event_id IS NOT NULL THEN
                  SELECT "organizerId" INTO v_emitter_id FROM events WHERE id = v_event_id;
              END IF;
          END IF;

          IF v_emitter_id IS NULL THEN
              v_emitter_id := uuid_generate_v4();
          END IF;

          INSERT INTO event_queue (
              type,
              emitter,
              "emitterId",
              payload,
              target_services,
              version,
              status,
              attempts,
              updated_at,
              created_at
          ) VALUES (
              event_type,
              emitter_name,
              v_emitter_id,
              payload_data,
              ARRAY['social:interaction'],
              1,
              'PENDING',
              0,
              now(),
              now()
          );

          IF (TG_OP = 'DELETE') THEN
              RETURN OLD;
          END IF;
          RETURN NEW;
      END;
      $$ LANGUAGE plpgsql;
    `);
  }
}
