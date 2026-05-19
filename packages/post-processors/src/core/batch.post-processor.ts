import { BasePostProcessor } from './base.post-processor.js';
import type { EventMessagingType, EventRegistry, StreamEvent } from '@volontariapp/messaging';
import type { RedisStreamEntry, ExtractPayload } from '../types/index.js';
import type { BatchEventItem } from '../interfaces/index.js';
import { RedisStreamHelper } from './redis-stream.helper.js';

export abstract class BatchPostProcessor<
  TKey extends EventMessagingType = EventMessagingType,
> extends BasePostProcessor {
  protected abstract processEvents(events: BatchEventItem<TKey>[]): Promise<void>;

  /**
   * Reads and processes the stream entries in batches.
   */
  protected override async processEntries(entries: RedisStreamEntry[]): Promise<void> {
    const items: BatchEventItem<TKey>[] = [];
    const acquiredMessageIds: string[] = [];
    const ttl = this.options.idempotencyTtlSeconds;

    for (const entry of entries) {
      await this.filterAndLockEntry(entry, ttl, items, acquiredMessageIds);
    }

    if (items.length === 0) return;

    await this.executeBatchProcessing(items, acquiredMessageIds, ttl > 0);
  }

  /**
   * Filters invalid/unhandled entries and locks valid ones using idempotency.
   */
  private async filterAndLockEntry(
    entry: RedisStreamEntry,
    ttl: number,
    items: BatchEventItem<TKey>[],
    acquiredMessageIds: string[],
  ): Promise<boolean> {
    const { id, fields } = entry;

    if (!fields.event) {
      this.logger.warn('Stream message missing event payload, acknowledging and skipping', {
        messageId: id,
      });
      await this.acknowledge(id);
      return false;
    }

    if (!this.shouldProcess(fields.type ?? '')) {
      this.logger.debug('Skipping message: type not registered/handled', {
        messageId: id,
        type: fields.type,
      });
      await this.acknowledge(id);
      return false;
    }

    if (
      ttl > 0 &&
      !(await RedisStreamHelper.acquireIdempotencyLock(this.redis, this.options.groupName, id, ttl))
    ) {
      this.logger.warn('Message already processed or currently processing (idempotency block)', {
        messageId: id,
      });
      await this.acknowledge(id);
      return false;
    }

    return this.parseAndAccumulateEntry(id, fields.event, ttl > 0, items, acquiredMessageIds);
  }

  /**
   * Parses stream entry payload and stores in batch collection.
   */
  private async parseAndAccumulateEntry(
    id: string,
    rawEvent: string,
    useIdempotency: boolean,
    items: BatchEventItem<TKey>[],
    acquiredMessageIds: string[],
  ): Promise<boolean> {
    try {
      const event = JSON.parse(rawEvent) as StreamEvent<ExtractPayload<EventRegistry[TKey]>>;
      items.push({ event, messageId: id });
      if (useIdempotency) acquiredMessageIds.push(id);
      return true;
    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err));
      this.logger.error('Failed to parse event payload, acknowledging and skipping', {
        messageId: id,
        error,
      });
      await this.acknowledge(id);
      if (useIdempotency) {
        await RedisStreamHelper.removeIdempotencyLock(this.redis, this.options.groupName, id);
      }
      return false;
    }
  }

  /**
   * Invokes processEvents and acknowledges processed messages on success.
   */
  private async executeBatchProcessing(
    items: BatchEventItem<TKey>[],
    acquiredMessageIds: string[],
    useIdempotency: boolean,
  ): Promise<void> {
    try {
      this.logger.info('Processing batch of events', { count: items.length });
      await this.processEvents(items);

      for (const item of items) {
        await this.acknowledge(item.messageId);
      }
      this.logger.info('Successfully processed batch of events', { count: items.length });
    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err));
      this.logger.error('Failed to process batch of events from stream', { error });
      if (useIdempotency) {
        await this.releaseIdempotencyLocks(acquiredMessageIds);
      }
    }
  }

  /**
   * Releases idempotency locks for a list of message IDs on error.
   */
  private async releaseIdempotencyLocks(messageIds: string[]): Promise<void> {
    for (const id of messageIds) {
      try {
        await RedisStreamHelper.removeIdempotencyLock(this.redis, this.options.groupName, id);
      } catch (err) {
        const error = err instanceof Error ? err : new Error(String(err));
        this.logger.error('Failed to release idempotency lock', { messageId: id, error });
      }
    }
  }
}
