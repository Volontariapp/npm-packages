import { BasePostProcessor } from './base.post-processor.js';
import type {
  EventMessagingType,
  EventRegistry,
  StreamEvent,
  EventChangedPayload,
} from '@volontariapp/messaging';
import type { ParseResult, RedisStreamEntry } from '../../types/index.js';
import { IdempotencyLockState, RedisStreamHelper } from '../helpers/redis-stream.helper.js';
import { runInTraceContext } from '@volontariapp/database';
import { isInfrastructureError } from '@volontariapp/errors';

type ExtractPayload<T> = T extends EventChangedPayload<infer P> ? P : T;

export abstract class SinglePostProcessor<
  EventType extends EventMessagingType,
> extends BasePostProcessor<EventType> {
  /**
   * Processes a single event. Must be implemented by subclasses.
   */
  protected abstract processEvent(
    event: StreamEvent<ExtractPayload<EventRegistry[EventType]>>,
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

    if (!fields.type || !this.shouldProcess(fields.type as EventType)) {
      this.logger.debug('Skipping message: type not registered/handled', {
        messageId: id,
        type: fields.type,
      });
      await this.acknowledge(id);
      return;
    }

    const useIdempotency = this.options.idempotencyTtlSeconds > 0;
    const idempotencyId = RedisStreamHelper.resolveIdempotencyId(entry);
    if (useIdempotency) {
      const [state] = await RedisStreamHelper.acquireIdempotencyLocks(
        this.redis,
        this.options.groupName,
        [{ idempotencyId, legacyMessageId: id }],
        this.processingLockTtlSeconds,
      );
      if (state === IdempotencyLockState.DONE) {
        this.logger.warn('Event already processed (idempotency block), acknowledging', {
          messageId: id,
          eventId: idempotencyId,
        });
        await this.acknowledge(id);
        return;
      }
      if (state !== IdempotencyLockState.ACQUIRED) {
        this.deferLockedMessage(id, idempotencyId);
        return;
      }
    }

    await this.executeEventProcessing(id, fields.event, useIdempotency ? idempotencyId : null);
  }

  /**
   * Parse the event payload and run subclass processEvent handler with retry logic.
   */
  private async executeEventProcessing(
    id: string,
    rawEvent: string,
    idempotencyId: string | null,
  ): Promise<void> {
    try {
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

      this.logger.info('Processing event', { messageId: id, eventId: event.id, type: event.type });

      await runInTraceContext(
        {
          traceparent: event.traceparent,
          name: `event ${event.type}`,
          attributes: {
            type: event.type,
            emitter: event.emitter,
            correlation_id: event.correlationId,
          },
        },
        () => this.processEvent(event, id),
      );
      this.circuitBreaker.recordSuccess();
      this.streamMetrics.recordProcessed(1);

      if (idempotencyId !== null) {
        // Done before the acknowledgement: a crash in between only leads to an acknowledgement.
        await RedisStreamHelper.markIdempotencyDone(
          this.redis,
          this.options.groupName,
          [idempotencyId],
          this.options.idempotencyTtlSeconds,
        );
      }
      await this.retryHelper.clearRetryData(this.redis, this.options.groupName, id);
      await this.acknowledge(id);
      this.logger.info('Successfully processed event', {
        messageId: id,
        eventId: event.id,
        type: event.type,
      });
    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err));
      this.logger.error('Failed to process event from stream', { messageId: id, error });

      this.circuitBreaker.recordFailure();

      // Handle retry logic
      await this.handleProcessingFailure(id, error, rawEvent, idempotencyId);
    }
  }

  /**
   * Handles retry logic when event processing fails.
   */
  private async handleProcessingFailure(
    messageId: string,
    error: Error,
    rawEvent: string,
    idempotencyId: string | null,
  ): Promise<void> {
    try {
      if (isInfrastructureError(error)) {
        this.deferInfrastructureRetry([messageId], error);
        return;
      }

      const attemptCount = await this.retryHelper.recordRetry(
        this.redis,
        this.options.groupName,
        messageId,
        error,
        this.options.idempotencyTtlSeconds,
      );
      this.streamMetrics.recordRetryAttempt();

      if (this.retryHelper.shouldRetry(attemptCount)) {
        await this.retryHelper.enqueueForRetry(
          this.redis,
          this.options.groupName,
          messageId,
          attemptCount,
        );

        const delayMs = this.retryHelper.calculateDelay(attemptCount);
        this.logger.warn('Message scheduled for retry', {
          messageId,
          attemptCount,
          delayMs,
          nextRetryIn: new Date(Date.now() + delayMs).toISOString(),
        });
      } else {
        // Max retries exceeded - send to DLQ
        const payloadFields = this.parsePayloadFields(rawEvent);
        await this.sendMessageToDlq(messageId, payloadFields, error.message);

        this.logger.error('Message max retries exceeded, sent to DLQ', {
          messageId,
          attemptCount,
          maxRetries: this.options.retry.maxRetries,
        });

        await this.acknowledge(messageId);
      }
    } catch (retryErr) {
      const retryError = retryErr instanceof Error ? retryErr : new Error(String(retryErr));
      this.logger.error('Failed to handle retry logic', { messageId, error: retryError });
    } finally {
      if (idempotencyId !== null) {
        await RedisStreamHelper.removeIdempotencyLock(
          this.redis,
          this.options.groupName,
          idempotencyId,
        );
      }
    }
  }

  /**
   * Helper to parse payload fields from raw event JSON.
   */
  private parsePayloadFields(rawEvent: string): ParseResult {
    try {
      const event = JSON.parse(rawEvent) as StreamEvent<ExtractPayload<EventRegistry[EventType]>>;

      return {
        success: true,
        type: event.type,
        id: event.id,
        payload: JSON.stringify(event),
      };
    } catch {
      return {
        success: false,
        error: 'Failed to parse event payload',
        raw: rawEvent.substring(0, 200),
      };
    }
  }
}
