import { jest } from '@jest/globals';
import type { Repository } from '@volontariapp/database';
import type { EventQueueModel } from '@volontariapp/database';

export const createEventQueueRepositoryMock = (): jest.Mocked<Repository<EventQueueModel>> =>
  ({
    create: jest.fn(),
    save: jest.fn(),
  }) as unknown as jest.Mocked<Repository<EventQueueModel>>;
