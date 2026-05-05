import type { EventQueueEntity } from '@volontariapp/database';
import { EventQueueModel } from '@volontariapp/database';
import {
  makeOutboxRepositoryMock,
  type OutboxRepositoryMock,
} from '../shared/outbox-repository-mock.helper.js';
import {
  makeOutboxConsumerRepositoryMock,
  type OutboxConsumerRepositoryMock,
} from '../shared/outbox-consumer-repository-mock.helper.js';

export type EventQueueRepositoryMock = OutboxRepositoryMock<EventQueueEntity, EventQueueModel>;

export function makeEventQueueRepositoryMock(): EventQueueRepositoryMock {
  return makeOutboxRepositoryMock<EventQueueEntity, EventQueueModel>();
}

export type EventQueueConsumerRepositoryMock = OutboxConsumerRepositoryMock<
  EventQueueModel,
  EventQueueEntity
>;

export function makeEventQueueConsumerRepositoryMock(): EventQueueConsumerRepositoryMock {
  return makeOutboxConsumerRepositoryMock<EventQueueModel, EventQueueEntity>(EventQueueModel);
}
