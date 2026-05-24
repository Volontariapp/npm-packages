export const USERS_TRIGGER = `
DROP TRIGGER IF EXISTS users_created_event_queue_trigger ON users;

CREATE OR REPLACE FUNCTION create_user_created_event_queue_record()
RETURNS TRIGGER AS $$
BEGIN
    IF (TG_OP = 'INSERT') THEN
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
            'user.created',
            'ms-user',
            NEW.id,
            jsonb_build_object('after', jsonb_build_object('id', NEW.id, 'role', NEW.role)),
            ARRAY['social:user'],
            1,
            'PENDING',
            0,
            now(),
            now()
        );
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER users_created_event_queue_trigger
AFTER INSERT ON users
FOR EACH ROW EXECUTE FUNCTION create_user_created_event_queue_record();
`;
