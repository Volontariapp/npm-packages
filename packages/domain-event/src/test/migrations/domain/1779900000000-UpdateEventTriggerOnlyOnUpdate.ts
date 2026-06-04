import type { MigrationInterface, QueryRunner } from 'typeorm';

export class UpdateEventTriggerOnlyOnUpdate1779900000000 implements MigrationInterface {
  name = 'UpdateEventTriggerOnlyOnUpdate1779900000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TRIGGER IF EXISTS events_event_queue_trigger ON events;`);
    await queryRunner.query(`
      CREATE TRIGGER events_event_queue_trigger
      AFTER UPDATE ON events
      FOR EACH ROW EXECUTE FUNCTION create_event_queue_record('event.changed', 'ms-event');
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TRIGGER IF EXISTS events_event_queue_trigger ON events;`);
    await queryRunner.query(`
      CREATE TRIGGER events_event_queue_trigger
      AFTER INSERT OR UPDATE OR DELETE ON events
      FOR EACH ROW EXECUTE FUNCTION create_event_queue_record('event.changed', 'ms-event');
    `);
  }
}
