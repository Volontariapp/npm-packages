import { OutboxStatus } from '../../../outbox/types/outbox.status.js';
import { EventQueueEntity } from '../../../outbox/entities/event-queue.entity.js';

export const makeEventQueueEvent = (
  overrides: Partial<EventQueueEntity> = {},
): EventQueueEntity => {
  return Object.assign(new EventQueueEntity(), {
    type: 'event.entity.updated',
    emitter: 'database-tests',
    version: 1,
    payload: {
      after: { id: 'entity-1', state: 'created' },
    },
    status: OutboxStatus.PENDING,
    attempts: 0,
    createdAt: new Date(Date.now() - 60_000),
    updatedAt: new Date(),
    ...overrides,
  });
};
