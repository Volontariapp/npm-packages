import { OutboxPusher, type EventQueueEntity } from '@volontariapp/database';
import type { Logger } from '@volontariapp/logger';

export class EventQueuePusher extends OutboxPusher<EventQueueEntity> {
  constructor(private readonly logger: Logger) {
    super();
  }

  pushElement(entity: EventQueueEntity): Promise<void> {
    this.logger.info(`Pushing event queue item ${entity.id.toString()}`);
    // TODO: Implement pushing a single event
    return Promise.resolve();
  }

  pushBulkElement(entities: EventQueueEntity[]): Promise<void> {
    this.logger.info(`Pushing ${entities.length.toString()} event queue items`);
    // TODO: Implement pushing multiple events
    return Promise.resolve();
  }
}
