import { OutboxPusher, type EventQueueEntity } from '@volontariapp/database';
import type { Logger } from '@volontariapp/logger';
import type { Redis } from 'ioredis';

type Pipeline = ReturnType<Redis['pipeline']>;

import {
  getEventStreamName,
  type RedisEventMessage,
  type RedisEventStreamFields,
} from '@volontariapp/messaging';

export class EventQueuePusher extends OutboxPusher<EventQueueEntity<string, unknown>> {
  private readonly MAX_LEN = 10000;

  constructor(
    private readonly logger: Logger,
    private readonly redis: Redis,
  ) {
    super();
  }

  private formatMessage<K extends string, P>(entity: EventQueueEntity<K, P>): string {
    const { id, type, emitter, emitterId, correlationId, traceId, version, payload, createdAt } =
      entity;

    const message: RedisEventMessage<P> = {
      id,
      type,
      emitter,
      emitterId,
      correlationId,
      traceId,
      version,
      payload: {
        before: payload.before,
        after: payload.after,
      },
      createdAt: createdAt.toISOString(),
    };

    return JSON.stringify(message);
  }

  private createStreamFields(entity: EventQueueEntity<string, unknown>): RedisEventStreamFields {
    const eventJson = this.formatMessage(entity);
    return {
      id: entity.id,
      type: entity.type,
      emitter: entity.emitter,
      emitterId: entity.emitterId,
      correlationId: entity.correlationId,
      traceId: entity.traceId ?? '',
      version: entity.version.toString(),
      createdAt: entity.createdAt.toISOString(),
      payload: JSON.stringify(entity.payload),
      event: eventJson,
    };
  }

  private addEntityToPipeline(
    pipeline: Pipeline,
    entity: EventQueueEntity<string, unknown>,
  ): boolean {
    const targetServices = entity.targetServices;

    if (targetServices.length === 0) {
      this.logger.warn(`Event ${entity.id} has no target services, skipping push`);
      return false;
    }

    const fields = this.createStreamFields(entity);
    for (const targetService of targetServices) {
      const streamName = getEventStreamName(targetService as string);
      pipeline.xadd(
        streamName,
        'MAXLEN',
        '~',
        this.MAX_LEN,
        '*',
        'id',
        fields.id,
        'type',
        fields.type,
        'emitter',
        fields.emitter,
        'emitterId',
        fields.emitterId,
        'correlationId',
        fields.correlationId,
        'traceId',
        fields.traceId,
        'version',
        fields.version,
        'createdAt',
        fields.createdAt,
        'payload',
        fields.payload,
        'event',
        fields.event,
      );
    }
    return true;
  }

  private async executePipeline(pipeline: Pipeline): Promise<void> {
    const results: [Error | null, unknown][] | null = await pipeline.exec();

    if (results) {
      for (const [error] of results) {
        if (error instanceof Error) throw error;
      }
    }
  }

  async pushElement(entity: EventQueueEntity<string, unknown>): Promise<void> {
    this.logger.info(`Pushing event queue item ${entity.id}`);

    try {
      const pipeline = this.redis.pipeline();
      const added = this.addEntityToPipeline(pipeline, entity);

      if (added) {
        await this.executePipeline(pipeline);
      }
    } catch (error) {
      this.logger.error(`Failed to push event queue item ${entity.id}`, { error });
      throw error;
    }
  }

  async pushBulkElement(entities: EventQueueEntity<string, unknown>[]): Promise<void> {
    if (entities.length === 0) return;
    this.logger.info(`Pushing bulk event queue items (${entities.length.toString()})`);

    try {
      const pipeline = this.redis.pipeline();
      let hasOperations = false;

      for (const entity of entities) {
        if (this.addEntityToPipeline(pipeline, entity)) {
          hasOperations = true;
        }
      }

      if (hasOperations) {
        await this.executePipeline(pipeline);
      }
    } catch (error) {
      this.logger.error('Failed to push bulk event queue items', { error });
      throw error;
    }
  }
}
