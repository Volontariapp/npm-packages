import { BasePostProcessor } from './base.post-processor.js';
import type {
  EventMessagingType,
  EventRegistry,
  StreamEvent,
  EventChangedPayload,
} from '@volontariapp/messaging';
import type { RedisStreamEntry } from '../types/index.js';
import { RedisStreamHelper } from './redis-stream.helper.js';

type ExtractPayload<T> = T extends EventChangedPayload<infer P> ? P : T;

export abstract class SinglePostProcessor<
  TKey extends EventMessagingType = EventMessagingType,
> extends BasePostProcessor {
  /**
   * Processes a single event. Must be implemented by subclasses.
   */
  protected abstract processEvent(
    event: StreamEvent<ExtractPayload<EventRegistry[TKey]>>,
    messageId: string,
  ): Promise<void>;

  /**
   * Implements processEntries one-by-one.
   */
  protected override async processEntries(entries: RedisStreamEntry[]): Promise<void> {
    for (const entry of entries) {
      await this.processSingleEntry(entry);
    }
  }

  /**
   * Handles processing details for a single stream entry.
   */
  private async processSingleEntry(entry: RedisStreamEntry): Promise<void> {
    const { id, fields } = entry;

    if (!fields.event) {
      this.logger.warn('Stream message missing event payload, acknowledging and skipping', {
        messageId: id,
      });
      await this.acknowledge(id);
      return;
    }

    if (!this.shouldProcess(fields.type ?? '')) {
      this.logger.debug('Skipping message: type not registered/handled', {
        messageId: id,
        type: fields.type,
      });
      await this.acknowledge(id);
      return;
    }

    const ttl = this.options.idempotencyTtlSeconds;
    if (
      ttl > 0 &&
      !(await RedisStreamHelper.acquireIdempotencyLock(this.redis, this.options.groupName, id, ttl))
    ) {
      this.logger.warn('Message already processed or currently processing (idempotency block)', {
        messageId: id,
      });
      await this.acknowledge(id);
      return;
    }

    await this.executeEventProcessing(id, fields.event, ttl > 0);
  }

  /**
   * Parse the event payload and run subclass processEvent handler.
   */
  private async executeEventProcessing(
    id: string,
    rawEvent: string,
    useIdempotency: boolean,
  ): Promise<void> {
    try {
      const event = JSON.parse(rawEvent) as StreamEvent<ExtractPayload<EventRegistry[TKey]>>;
      this.logger.info('Processing event', { messageId: id, eventId: event.id, type: event.type });

      await this.processEvent(event, id);
      await this.acknowledge(id);
      this.logger.info('Successfully processed event', {
        messageId: id,
        eventId: event.id,
        type: event.type,
      });
    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err));
      this.logger.error('Failed to process event from stream', { messageId: id, error });
      if (useIdempotency) {
        await RedisStreamHelper.removeIdempotencyLock(this.redis, this.options.groupName, id);
      }
    }
  }
}
