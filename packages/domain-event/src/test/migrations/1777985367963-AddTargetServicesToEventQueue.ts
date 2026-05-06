import type { MigrationInterface, QueryRunner } from 'typeorm';

export class AddTargetServicesToEventQueue1777985367963 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // 1. Check if column exists before adding it
    const table = await queryRunner.getTable('event_queue');
    const hasTargetServices = table?.findColumnByName('target_services');

    if (!hasTargetServices) {
      await queryRunner.query(
        `ALTER TABLE "event_queue" ADD "target_services" varchar array NOT NULL DEFAULT '{}'`,
      );
    }

    // 2. Update trigger function (always safe to replace)
    await queryRunner.query(`
      CREATE OR REPLACE FUNCTION create_event_queue_record()
      RETURNS TRIGGER AS $$
      DECLARE
          payload_data JSONB;
      BEGIN
          IF (TG_OP = 'DELETE') THEN
              payload_data := jsonb_build_object('before', to_jsonb(OLD), 'after', NULL);
          ELSIF (TG_OP = 'INSERT') THEN
              payload_data := jsonb_build_object('before', NULL, 'after', to_jsonb(NEW));
          ELSIF (TG_OP = 'UPDATE') THEN
              payload_data := jsonb_build_object('before', to_jsonb(OLD), 'after', to_jsonb(NEW));
          END IF;

          INSERT INTO event_queue (type, emitter, payload, version, updated_at, target_services)
          VALUES (TG_ARGV[0], TG_ARGV[1], payload_data, 1, now(), ARRAY['social']);
          
          IF (TG_OP = 'DELETE') THEN
              RETURN OLD;
          END IF;
          RETURN NEW;
      END;
      $$ LANGUAGE plpgsql;
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Revert trigger function
    await queryRunner.query(`
      CREATE OR REPLACE FUNCTION create_event_queue_record()
      RETURNS TRIGGER AS $$
      BEGIN
          INSERT INTO event_queue (type, emitter, payload, version, updated_at)
          VALUES (TG_ARGV[0], TG_ARGV[1], to_jsonb(NEW), 1, now());
          RETURN NEW;
      END;
      $$ LANGUAGE plpgsql;
    `);

    // Drop column if it exists
    const table = await queryRunner.getTable('event_queue');
    const hasTargetServices = table?.findColumnByName('target_services');
    if (hasTargetServices) {
      await queryRunner.query(`ALTER TABLE "event_queue" DROP COLUMN "target_services"`);
    }
  }
}
