import { OutboxStatus, EventQueueEntity } from '@volontariapp/database';

export const makeEventQueueEvent = (
  overrides: Partial<EventQueueEntity> = {},
): EventQueueEntity => {
  return Object.assign(new EventQueueEntity(), {
    type: 'event.entity.updated',
    emitter: 'database-tests',
    emitterId: '00000000-0000-0000-0000-000000000000',
    version: 1,
    payload: {
      after: { id: 'entity-1', state: 'created' },
    },
    status: OutboxStatus.PENDING,
    attempts: 0,
    targetServices: [],
    createdAt: new Date(Date.now() - 60_000),
    updatedAt: new Date(),
    ...overrides,
  });
};
