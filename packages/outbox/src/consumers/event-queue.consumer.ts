import type { BaseRepository, EventQueueEntity, EventQueueModel } from '@volontariapp/database';
import { OutboxConsumer } from '@volontariapp/database';
import type { Logger } from '@volontariapp/logger';
import { EventQueueDispatcher } from '../dispatchers/event-queue.dispatcher.js';

export class EventQueueConsumer extends OutboxConsumer<EventQueueModel, EventQueueEntity> {
  constructor(
    logger: Logger,
    repository: BaseRepository<EventQueueModel, EventQueueEntity, string>,
    batchSize: number,
  ) {
    super(logger, repository, batchSize, new EventQueueDispatcher(logger, repository));
  }
}
