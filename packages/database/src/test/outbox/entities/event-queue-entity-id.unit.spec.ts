import { describe, expect, it } from '@jest/globals';
import { EventQueueEntity } from '../../../outbox/entities/event-queue.entity.js';

const baseProps = {
  type: 'test.event',
  emitter: 'database-tests',
  emitterId: '00000000-0000-0000-0000-000000000000',
  payload: {},
  targetServices: [],
};

describe('EventQueueEntity.createEvent id', () => {
  it('should use the given id so a retried producer writes the same row id', () => {
    const id = '11111111-1111-4111-8111-111111111111';

    expect(EventQueueEntity.createEvent({ ...baseProps, id }).id).toBe(id);
    expect(EventQueueEntity.createEvent({ ...baseProps, id }).id).toBe(id);
  });

  it('should generate a random id when none is given', () => {
    const first = EventQueueEntity.createEvent(baseProps);
    const second = EventQueueEntity.createEvent(baseProps);

    expect(first.id).toMatch(/^[0-9a-f-]{36}$/);
    expect(first.id).not.toBe(second.id);
  });
});
