import { OutboxPusher, type EventQueueEntity } from '@volontariapp/database';
import type { Logger } from '@volontariapp/logger';
import type { Redis } from 'ioredis';
import { getEventStreamName, type RedisEventMessage } from '@volontariapp/messaging';

export class EventQueuePusher extends OutboxPusher<EventQueueEntity> {
  private readonly MAX_LEN = 10000;

  constructor(
    private readonly logger: Logger,
    private readonly redis: Redis,
  ) {
    super();
  }

  private formatMessage<K extends string, P>(entity: EventQueueEntity<K, P>): string {
    const message: RedisEventMessage<P> = {
      id: entity.id,
      type: entity.type,
      emitter: entity.emitter,
      traceId: entity.traceId,
      version: entity.version,
      payload: entity.payload,
      createdAt: entity.createdAt.toISOString(),
    };
    return JSON.stringify(message);
  }

  async pushElement(entity: EventQueueEntity): Promise<void> {
    this.logger.info(`Pushing event queue item ${entity.id}`);

    try {
      const payload = this.formatMessage(entity);
      const pipeline = this.redis.pipeline();

      for (const targetService of entity.targetServices) {
        const streamName = getEventStreamName(targetService);
        pipeline.xadd(streamName, 'MAXLEN', '~', this.MAX_LEN, '*', 'event', payload);
      }

      await pipeline.exec();
    } catch (error) {
      this.logger.error(`Failed to push event queue item ${entity.id}`, { error });
      throw error;
    }
  }

  async pushBulkElement(entities: EventQueueEntity[]): Promise<void> {
    this.logger.info(`Pushing ${entities.length.toString()} event queue items`);

    try {
      const pipeline = this.redis.pipeline();

      for (const entity of entities) {
        const payload = this.formatMessage(entity);

        for (const targetService of entity.targetServices) {
          const streamName = getEventStreamName(targetService);
          pipeline.xadd(streamName, 'MAXLEN', '~', this.MAX_LEN, '*', 'event', payload);
        }
      }

      await pipeline.exec();
    } catch (error) {
      this.logger.error(`Failed to push bulk event queue items`, { error });
      throw error;
    }
  }
}
