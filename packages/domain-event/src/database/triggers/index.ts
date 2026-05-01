import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const readSqlFile = (filename: string) => readFileSync(join(__dirname, filename), 'utf8');

export const EVENT_QUEUE_TRIGGER_FUNCTION = readSqlFile('event-queue-trigger.sql');
export const EVENTS_TRIGGER = readSqlFile('events.trigger.sql');
export const REQUIREMENTS_TRIGGER = readSqlFile('requirements.trigger.sql');
export const TAGS_TRIGGER = readSqlFile('tags.trigger.sql');
export const EVENT_TAGS_TRIGGER = readSqlFile('event_tags.trigger.sql');

/**
 * Helper to generate a custom trigger for any table
 */
export function getTriggerSql(tableName: string, eventType: string, emitter: string): string {
  const triggerName = `${tableName}_event_queue_trigger`;
  return `
    DROP TRIGGER IF EXISTS ${triggerName} ON ${tableName};
    CREATE TRIGGER ${triggerName}
    AFTER INSERT OR UPDATE OR DELETE ON ${tableName}
    FOR EACH ROW EXECUTE FUNCTION create_event_queue_record('${eventType}', '${emitter}');
  `;
}
