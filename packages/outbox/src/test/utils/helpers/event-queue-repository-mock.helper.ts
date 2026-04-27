import type { EventQueueEntity } from '@volontariapp/database';
import { EventQueueModel } from '@volontariapp/database';
import {
  makeOutboxWriterRepositoryMock,
  type OutboxWriterRepositoryMock,
} from './outbox-writer-mock.helper.js';
import {
  makeOutboxConsumerRepositoryMock,
  type OutboxConsumerRepositoryMock,
} from './outbox-consumer-repository-mock.helper.js';

export type EventQueueRepositoryMock = OutboxWriterRepositoryMock<
  EventQueueModel,
  EventQueueEntity
>;

export function makeEventQueueRepositoryMock(): EventQueueRepositoryMock {
  return makeOutboxWriterRepositoryMock<EventQueueModel, EventQueueEntity>();
}

export type EventQueueConsumerRepositoryMock = OutboxConsumerRepositoryMock<
  EventQueueModel,
  EventQueueEntity
>;

export function makeEventQueueConsumerRepositoryMock(): EventQueueConsumerRepositoryMock {
  return makeOutboxConsumerRepositoryMock<EventQueueModel, EventQueueEntity>(EventQueueModel);
}
