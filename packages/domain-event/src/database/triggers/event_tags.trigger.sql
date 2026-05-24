DROP TRIGGER IF EXISTS event_tags_event_queue_trigger ON event_tags;
CREATE TRIGGER event_tags_event_queue_trigger
AFTER INSERT OR DELETE ON event_tags
FOR EACH ROW EXECUTE FUNCTION create_event_queue_record('event.tag_linked', 'ms-event');
