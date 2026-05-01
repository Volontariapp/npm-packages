CREATE OR REPLACE FUNCTION create_event_queue_record() RETURNS TRIGGER AS $$
DECLARE
    event_type TEXT := TG_ARGV[0];
    emitter_name TEXT := TG_ARGV[1];
    payload_data JSONB;
BEGIN
    IF (TG_OP = 'DELETE') THEN
        payload_data := jsonb_build_object('before', row_to_json(OLD), 'after', NULL);
    ELSIF (TG_OP = 'INSERT') THEN
        payload_data := jsonb_build_object('before', NULL, 'after', row_to_json(NEW));
    ELSIF (TG_OP = 'UPDATE') THEN
        payload_data := jsonb_build_object('before', row_to_json(OLD), 'after', row_to_json(NEW));
    END IF;

    INSERT INTO event_queue (
        type,
        emitter,
        payload,
        version,
        status,
        attempts,
        updated_at,
        created_at
    ) VALUES (
        event_type,
        emitter_name,
        payload_data,
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
