import { OutboxStatus } from '../../outbox/types/outbox.status.js';
import { ExtendedOutboxEntity } from '../example/entities/extended-outbox.entity.js';

export const makeExtendedOutboxEvent = (
  overrides: Partial<ExtendedOutboxEntity> = {},
): ExtendedOutboxEntity => {
  return Object.assign(new ExtendedOutboxEntity(), {
    id: 'extended-outbox-id',
    type: 'extended.created',
    emitter: 'database-tests',
    status: OutboxStatus.PENDING,
    attempts: 0,
    createdAt: new Date(Date.now() - 60_000),
    updatedAt: new Date(),
    channel: 'default',
    ...overrides,
  });
};
