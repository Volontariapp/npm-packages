DROP TRIGGER IF EXISTS tags_event_queue_trigger ON tags;

CREATE TRIGGER tags_event_queue_trigger
AFTER INSERT OR UPDATE OR DELETE ON tags
FOR EACH ROW EXECUTE FUNCTION create_event_queue_record('tag.changed', 'ms-event-db');

