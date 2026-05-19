import { BasePostProcessor } from './base.post-processor.js';
import type { EventMessagingType, EventRegistry, StreamEvent } from '@volontariapp/messaging';
import type { RedisStreamEntry, ExtractPayload, ParseResult } from '../../types/index.js';
import type { BatchEventItem } from '../../interfaces/index.js';
import { RedisStreamHelper } from '../helpers/redis-stream.helper.js';

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
      if (typeof event !== 'object') {
        throw new Error('Event payload must be a non-null object');
      }
      if (typeof event.id !== 'string' || event.id.trim() === '') {
        throw new Error('Event payload is missing a valid string id');
      }
      if (typeof event.type !== 'string' || event.type.trim() === '') {
        throw new Error('Event payload is missing a valid string type');
      }

      items.push({ event, messageId: id });
      if (useIdempotency) acquiredMessageIds.push(id);
      return true;
    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err));
      this.logger.error('Failed to parse or validate event payload, acknowledging and skipping', {
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
   * Invokes processEvents with retry logic for failed batches.
   */
  private async executeBatchProcessing(
    items: BatchEventItem<TKey>[],
    _acquiredMessageIds: string[],
    useIdempotency: boolean,
  ): Promise<void> {
    try {
      this.logger.info('Processing batch of events', { count: items.length });
      await this.processEvents(items);
      this.circuitBreaker.recordSuccess();

      // Successfully processed - clear retry data and acknowledge all
      for (const item of items) {
        await this.retryHelper.clearRetryData(this.redis, this.options.groupName, item.messageId);
        await this.acknowledge(item.messageId);
      }
      this.logger.info('Successfully processed batch of events', { count: items.length });
    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err));
      this.logger.error('Failed to process batch of events from stream', { error });

      this.circuitBreaker.recordFailure();

      // Handle retry for each item in the batch individually
      await this.handleBatchProcessingFailure(items, error, useIdempotency);
    }
  }

  /**
   * Handles retry logic when batch processing fails.
   * Processes each message individually to decide if it should be retried or sent to DLQ.
   */
  private async handleBatchProcessingFailure(
    items: BatchEventItem<TKey>[],
    error: Error,
    useIdempotency: boolean,
  ): Promise<void> {
    for (const item of items) {
      try {
        const attemptCount = await this.retryHelper.recordRetry(
          this.redis,
          this.options.groupName,
          item.messageId,
          error,
          this.options.idempotencyTtlSeconds,
        );

        if (this.retryHelper.shouldRetry(attemptCount)) {
          await this.retryHelper.enqueueForRetry(
            this.redis,
            this.options.groupName,
            item.messageId,
            attemptCount,
          );

          const delayMs = this.retryHelper.calculateDelay(attemptCount);
          this.logger.warn('Batch item scheduled for retry', {
            messageId: item.messageId,
            attemptCount,
            delayMs,
          });
        } else {
          const payloadFields: ParseResult = {
            success: true,
            type: item.event.type,
            id: item.event.id,
            payload: JSON.stringify(item.event),
          };

          await this.sendMessageToDlq(item.messageId, payloadFields, error.message);

          this.logger.error('Batch item max retries exceeded, sent to DLQ', {
            messageId: item.messageId,
            attemptCount,
            maxRetries: this.options.retry.maxRetries,
          });

          await this.acknowledge(item.messageId);
        }
      } catch (handleErr) {
        const handleError = handleErr instanceof Error ? handleErr : new Error(String(handleErr));
        this.logger.error('Failed to handle batch item retry', {
          messageId: item.messageId,
          error: handleError,
        });
      }
    }

    if (useIdempotency) {
      await this.releaseIdempotencyLocks(items.map((item) => item.messageId));
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
