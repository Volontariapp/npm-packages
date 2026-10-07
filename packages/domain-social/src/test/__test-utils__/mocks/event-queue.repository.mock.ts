import { jest } from '@jest/globals';
import type { Repository } from '@volontariapp/database';
import { EventQueueModel, EventQueueEntity, databaseMapper } from '@volontariapp/database';

export const createEventQueueRepositoryMock = (): jest.Mocked<Repository<EventQueueModel>> => {
  databaseMapper.registerBidirectional(EventQueueModel, EventQueueEntity);
  return {
    create: jest.fn().mockImplementation((val: unknown) => val),
    save: jest.fn().mockImplementation((val: unknown) => Promise.resolve(val)),
  } as unknown as jest.Mocked<Repository<EventQueueModel>>;
};
