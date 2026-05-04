import { jest } from '@jest/globals';
import type { OutboxPusher } from '../../../outbox/pushers/outbox.pusher.js';
import type { OutboxEntity } from '../../../outbox/entities/outbox.entity.js';

export const makeOutboxPusherMock = <T extends OutboxEntity = OutboxEntity>() => {
  return {
    pushElement: jest.fn<OutboxPusher<T>['pushElement']>().mockResolvedValue(undefined),
    pushBulkElement: jest.fn<OutboxPusher<T>['pushBulkElement']>().mockResolvedValue(undefined),
  } as jest.Mocked<OutboxPusher<T>>;
};
