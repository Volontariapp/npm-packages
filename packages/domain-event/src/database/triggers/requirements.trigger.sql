DROP TRIGGER IF EXISTS requirements_event_queue_trigger ON requirements;

CREATE TRIGGER requirements_event_queue_trigger
AFTER INSERT OR UPDATE OR DELETE ON requirements
FOR EACH ROW EXECUTE FUNCTION create_event_queue_record('requirement.changed', 'ms-event-db');

