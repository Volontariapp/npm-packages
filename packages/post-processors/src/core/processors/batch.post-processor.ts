import { BasePostProcessor } from './base.post-processor.js';
import type { EventMessagingType, EventRegistry, StreamEvent } from '@volontariapp/messaging';
import type { RedisStreamEntry, ExtractPayload, ParseResult } from '../../types/index.js';
import type { BatchEventItem } from '../../interfaces/index.js';
import { IdempotencyLockState, RedisStreamHelper } from '../helpers/redis-stream.helper.js';
import { runBatchInTraceContext } from '@volontariapp/database';
import { isInfrastructureError } from '@volontariapp/errors';

/** Idempotency id (event id) of each locked message of the batch, by Redis message id. */
type LockedIds = Map<string, string>;

export abstract class BatchPostProcessor<
  EventType extends EventMessagingType,
> extends BasePostProcessor<EventType> {
  protected abstract processEvents(events: BatchEventItem<EventType>[]): Promise<void>;

  /**
   * Reads and processes the stream entries in batches. The idempotency locks of the batch are
   * taken in one round trip, on the event id, so an event pushed twice is processed once.
   */
  protected override async processEntries(entries: RedisStreamEntry[]): Promise<void> {
    const useIdempotency = this.options.idempotencyTtlSeconds > 0;
    const candidates: RedisStreamEntry[] = [];
    for (const entry of entries) {
      if (await this.isHandledEntry(entry)) candidates.push(entry);
    }
    if (candidates.length === 0) return;

    const idempotencyIds = candidates.map((entry) => RedisStreamHelper.resolveIdempotencyId(entry));
    const states = useIdempotency
      ? await RedisStreamHelper.acquireIdempotencyLocks(
          this.redis,
          this.options.groupName,
          candidates.map((entry, index) => ({
            idempotencyId: idempotencyIds[index] ?? entry.id,
            legacyMessageId: entry.id,
          })),
          this.processingLockTtlSeconds,
        )
      : candidates.map(() => IdempotencyLockState.ACQUIRED);

    const items: BatchEventItem<EventType>[] = [];
    const lockedIds: LockedIds = new Map();
    for (const [index, entry] of candidates.entries()) {
      const idempotencyId = idempotencyIds[index] ?? entry.id;
      const state = states[index] ?? IdempotencyLockState.PROCESSING;
      if (state === IdempotencyLockState.DONE) {
        this.logger.warn('Event already processed (idempotency block), acknowledging', {
          messageId: entry.id,
          eventId: idempotencyId,
        });
        await this.acknowledge(entry.id);
        continue;
      }
      if (state === IdempotencyLockState.PROCESSING) {
        this.deferLockedMessage(entry.id, idempotencyId);
        continue;
      }
      if (useIdempotency) lockedIds.set(entry.id, idempotencyId);
      await this.parseAndAccumulateEntry(entry, idempotencyId, items, lockedIds);
    }

    if (items.length === 0) return;

    await this.executeBatchProcessing(items, lockedIds);
  }

  /**
   * Acknowledges and skips the entries without payload or of a type this processor does not handle.
   */
  private async isHandledEntry(entry: RedisStreamEntry): Promise<boolean> {
    const { id, fields } = entry;

    if (!fields.event) {
      this.logger.warn('Stream message missing event payload, acknowledging and skipping', {
        messageId: id,
      });
      await this.acknowledge(id);
      return false;
    }

    if (!fields.type || !this.shouldProcess(fields.type as EventType)) {
      this.logger.debug('Skipping message: type not registered/handled', {
        messageId: id,
        type: fields.type,
      });
      await this.acknowledge(id);
      return false;
    }

    return true;
  }

  /**
   * Parses stream entry payload and stores in batch collection.
   */
  private async parseAndAccumulateEntry(
    entry: RedisStreamEntry,
    idempotencyId: string,
    items: BatchEventItem<EventType>[],
    lockedIds: LockedIds,
  ): Promise<boolean> {
    const id = entry.id;
    try {
      const rawEvent = entry.fields.event ?? '';
      const event = JSON.parse(rawEvent) as StreamEvent<ExtractPayload<EventRegistry[EventType]>>;
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
      return true;
    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err));
      this.logger.error('Failed to parse or validate event payload, acknowledging and skipping', {
        messageId: id,
        error,
      });
      await this.acknowledge(id);
      if (lockedIds.delete(id)) {
        await RedisStreamHelper.removeIdempotencyLock(
          this.redis,
          this.options.groupName,
          idempotencyId,
        );
      }
      return false;
    }
  }

  /**
   * Invokes processEvents with retry logic for failed batches.
   */
  private async executeBatchProcessing(
    items: BatchEventItem<EventType>[],
    lockedIds: LockedIds,
  ): Promise<void> {
    try {
      this.logger.info('Processing batch of events', { count: items.length });
      await runBatchInTraceContext(
        `batch ${this.options.groupName}`,
        items.map(({ event }) => ({
          traceparent: event.traceparent,
          name: `event ${event.type}`,
          attributes: {
            type: event.type,
            emitter: event.emitter,
            correlation_id: event.correlationId,
          },
        })),
        () => this.processEvents(items),
      );
      this.circuitBreaker.recordSuccess();
      this.streamMetrics.recordProcessed(items.length);

      const messageIds = items.map((item) => item.messageId);

      // Done before the acknowledgement: a crash in between leaves the messages pending, and
      // the next delivery finds them done and only acknowledges them.
      await RedisStreamHelper.markIdempotencyDone(
        this.redis,
        this.options.groupName,
        this.lockedIdsOf(messageIds, lockedIds),
        this.options.idempotencyTtlSeconds,
      );

      const startRetry = Date.now();
      await this.retryHelper.clearRetryDataMany(this.redis, this.options.groupName, messageIds);
      const endRetry = Date.now();
      this.logger.info(`[Monitoring] clearRetryDataMany took ${String(endRetry - startRetry)}ms`, {
        count: messageIds.length,
      });

      const startAck = Date.now();
      await this.acknowledgeMany(messageIds);
      const endAck = Date.now();
      this.logger.info(`[Monitoring] acknowledgeMany took ${String(endAck - startAck)}ms`, {
        count: messageIds.length,
      });
      this.logger.info('Successfully processed batch of events', { count: items.length });
    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err));
      this.logger.error('Failed to process batch of events from stream', { error });

      this.circuitBreaker.recordFailure();

      // Handle retry for each item in the batch individually
      await this.handleBatchProcessingFailure(items, error, lockedIds);
    }
  }

  private lockedIdsOf(messageIds: string[], lockedIds: LockedIds): string[] {
    return messageIds.flatMap((messageId) => {
      const idempotencyId = lockedIds.get(messageId);
      return idempotencyId === undefined ? [] : [idempotencyId];
    });
  }

  /**
   * Handles retry logic when batch processing fails.
   * Processes each message individually to decide if it should be retried or sent to DLQ.
   */
  private async handleBatchProcessingFailure(
    items: BatchEventItem<EventType>[],
    error: Error,
    lockedIds: LockedIds,
  ): Promise<void> {
    const messageIds = items.map((item) => item.messageId);
    if (isInfrastructureError(error)) {
      this.deferInfrastructureRetry(messageIds, error);
      await this.releaseIdempotencyLocks(this.lockedIdsOf(messageIds, lockedIds));
      return;
    }

    for (const item of items) {
      try {
        const attemptCount = await this.retryHelper.recordRetry(
          this.redis,
          this.options.groupName,
          item.messageId,
          error,
          this.options.idempotencyTtlSeconds,
        );
        this.streamMetrics.recordRetryAttempt();

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

    await this.releaseIdempotencyLocks(this.lockedIdsOf(messageIds, lockedIds));
  }

  /**
   * Releases idempotency locks (event ids) on error.
   */
  private async releaseIdempotencyLocks(idempotencyIds: string[]): Promise<void> {
    for (const id of idempotencyIds) {
      try {
        await RedisStreamHelper.removeIdempotencyLock(this.redis, this.options.groupName, id);
      } catch (err) {
        const error = err instanceof Error ? err : new Error(String(err));
        this.logger.error('Failed to release idempotency lock', { eventId: id, error });
      }
    }
  }
}
