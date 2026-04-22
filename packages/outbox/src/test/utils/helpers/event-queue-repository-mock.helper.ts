import { BaseRepository, EventQueueEntity, EventQueueModel } from '@volontariapp/database';
import { makeOutboxWriterRepositoryMock } from './outbox-writer-mock.helper.js';

export function makeEventQueueRepositoryMock(): BaseRepository<EventQueueModel, EventQueueEntity, string> {
  return makeOutboxWriterRepositoryMock<EventQueueModel, EventQueueEntity>() as BaseRepository<
    EventQueueModel,
    EventQueueEntity,
    string
  >;
}
