import type { MigrationInterface, QueryRunner } from 'typeorm';

export class AddJobAuditStatusTrigger1779115100001 implements MigrationInterface {
  name = 'AddJobAuditStatusTrigger1779115100001';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE OR REPLACE FUNCTION notify_job_audit_status_change()
      RETURNS TRIGGER AS $$
      BEGIN
        IF NEW.status = 'COMPLETED' THEN
          INSERT INTO event_queue (type, emitter, payload, version, updated_at, target_services)
          VALUES (
            'job.outbox.success',
            NEW.emitter,
            jsonb_build_object('before', to_jsonb(OLD), 'after', to_jsonb(NEW)),
            1,
            now(),
            ARRAY[NEW.emitter]
          );
        ELSIF NEW.status = 'FAILED' THEN
          INSERT INTO event_queue (type, emitter, payload, version, updated_at, target_services)
          VALUES (
            'job.outbox.failed',
            NEW.emitter,
            jsonb_build_object('before', to_jsonb(OLD), 'after', to_jsonb(NEW)),
            1,
            now(),
            ARRAY[NEW.emitter]
          );
        END IF;
        RETURN NEW;
      END;
      $$ LANGUAGE plpgsql;
    `);

    await queryRunner.query(`
      CREATE TRIGGER job_audit_status_trigger
      AFTER UPDATE OF status ON job_audit
      FOR EACH ROW
      EXECUTE FUNCTION notify_job_audit_status_change();
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TRIGGER IF EXISTS job_audit_status_trigger ON job_audit;`);
    await queryRunner.query(`DROP FUNCTION IF EXISTS notify_job_audit_status_change() CASCADE;`);
  }
}
