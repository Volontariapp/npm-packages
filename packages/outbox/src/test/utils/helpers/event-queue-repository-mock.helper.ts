import { EventQueueEntity, EventQueueModel } from '@volontariapp/database';
import {
  makeOutboxWriterRepositoryMock,
  type OutboxWriterRepositoryMock,
} from './outbox-writer-mock.helper.js';

export type EventQueueRepositoryMock = OutboxWriterRepositoryMock<
  EventQueueModel,
  EventQueueEntity
>;

export function makeEventQueueRepositoryMock(): EventQueueRepositoryMock {
  return makeOutboxWriterRepositoryMock<EventQueueModel, EventQueueEntity>();
}
