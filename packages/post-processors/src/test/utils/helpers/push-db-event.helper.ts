import type { Repository } from 'typeorm';
import type { Redis } from 'ioredis';
import type { EventQueueModel } from '@volontariapp/database';
import { EventQueueConsumer, EventQueuePusher } from '@volontariapp/outbox';
import { TestEventQueueRepository } from '@volontariapp/outbox/testing';
import type { Logger } from '@volontariapp/logger';
import type { ServiceType } from '@volontariapp/shared';
import { makeTestDbEvent } from '../factories/test-event.factory.js';

/**
 * Saves an event to the outbox DB table and immediately runs one outbox consumer
 * cycle so the event is pushed to the corresponding Redis stream.
 */
export async function pushDbEvent(
  repository: Repository<EventQueueModel>,
  redis: Redis,
  logger: Logger,
  id: string,
  type: string,
  targetServices: ServiceType[],
): Promise<void> {
  const pendingItem = makeTestDbEvent(repository, id, type, targetServices);
  await repository.save(pendingItem);

  const testRepository = new TestEventQueueRepository(repository);
  const pusher = new EventQueuePusher(logger, redis);
  const consumer = new EventQueueConsumer(logger, testRepository, 100, pusher);

  const fetched = await consumer.fetchPendingItems();
  await consumer.processItems(fetched);
}

/**
 * Saves multiple events to the outbox DB table and runs one outbox consumer
 * cycle to push them all to their Redis streams in a single batch.
 */
export async function pushDbEvents(
  repository: Repository<EventQueueModel>,
  redis: Redis,
  logger: Logger,
  events: { id: string; type: string }[],
  targetServices: ServiceType[],
): Promise<void> {
  for (const event of events) {
    const pendingItem = makeTestDbEvent(repository, event.id, event.type, targetServices);
    await repository.save(pendingItem);
  }

  const testRepository = new TestEventQueueRepository(repository);
  const pusher = new EventQueuePusher(logger, redis);
  const consumer = new EventQueueConsumer(logger, testRepository, 100, pusher);

  const fetched = await consumer.fetchPendingItems();
  await consumer.processItems(fetched);
}

/**
 * Starts a recurring outbox polling loop that flushes pending DB rows to Redis
 * streams every `intervalMs` ms. Call clearInterval() on the returned handle
 * in afterEach to stop it.
 */
export function startOutboxLoop(
  repository: Repository<EventQueueModel>,
  redis: Redis,
  logger: Logger,
  intervalMs = 50,
): NodeJS.Timeout {
  const testRepository = new TestEventQueueRepository(repository);
  const pusher = new EventQueuePusher(logger, redis);
  const consumer = new EventQueueConsumer(logger, testRepository, 10, pusher);

  return setInterval(() => {
    void consumer.fetchPendingItems().then(async (fetched) => {
      if (fetched.length > 0) {
        await consumer.processItems(fetched);
      }
    });
  }, intervalMs);
}
