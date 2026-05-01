import type {
  BaseRepository,
  EventQueueEntity,
  EventQueueModel,
  EventType,
} from '@volontariapp/database';
import { OutboxConsumer } from '@volontariapp/database';
import type { Logger } from '@volontariapp/logger';
import { EventQueueDispatcher } from '../dispatchers/event-queue.dispatcher.js';

export class EventQueueConsumer<K extends EventType = EventType> extends OutboxConsumer<
  EventQueueModel,
  EventQueueEntity<K>
> {
  constructor(
    logger: Logger,
    repository: BaseRepository<EventQueueModel, EventQueueEntity<K>, string>,
    batchSize: number,
  ) {
    super(logger, repository, batchSize, new EventQueueDispatcher<K>(logger, repository));
  }
}
