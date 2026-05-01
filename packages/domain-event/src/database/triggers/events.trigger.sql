DROP TRIGGER IF EXISTS events_event_queue_trigger ON events;

CREATE TRIGGER events_event_queue_trigger
AFTER INSERT OR UPDATE OR DELETE ON events
FOR EACH ROW EXECUTE FUNCTION create_event_queue_record('event.changed', 'ms-event-db');


