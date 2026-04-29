import type { EventQueueEntity } from '@volontariapp/database';
import { EventQueueModel } from '@volontariapp/database';
import {
  makeOutboxRepositoryMock,
  type OutboxRepositoryMock,
} from './outbox-repository-mock.helper.js';
import {
  makeOutboxConsumerRepositoryMock,
  type OutboxConsumerRepositoryMock,
} from './outbox-consumer-repository-mock.helper.js';

export type EventQueueRepositoryMock = OutboxRepositoryMock<EventQueueEntity>;

export function makeEventQueueRepositoryMock(): EventQueueRepositoryMock {
  return makeOutboxRepositoryMock<EventQueueEntity>();
}

export type EventQueueConsumerRepositoryMock = OutboxConsumerRepositoryMock<
  EventQueueModel,
  EventQueueEntity
>;

export function makeEventQueueConsumerRepositoryMock(): EventQueueConsumerRepositoryMock {
  return makeOutboxConsumerRepositoryMock<EventQueueModel, EventQueueEntity>(EventQueueModel);
}
