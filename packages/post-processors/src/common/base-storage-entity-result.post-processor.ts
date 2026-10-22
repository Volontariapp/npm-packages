import { BatchPostProcessor } from '../core/processors/batch.post-processor.js';
import type { PostProcessorOptions, BatchEventItem } from '../interfaces/index.js';
import type { Redis } from 'ioredis';
import type {
  StorageEventMessagingType,
  StorageEntityType,
  IStorageFileEntityPayload,
} from '@volontariapp/messaging';

export type StorageResultEventType =
  | StorageEventMessagingType.FILE_SCANNED
  | StorageEventMessagingType.FILE_REJECTED
  | StorageEventMessagingType.ATTACHMENT_REJECTED;

/**
 * Abstract base class for post-processors handling storage result events
 * (FILE_SCANNED, FILE_REJECTED, ATTACHMENT_REJECTED) targeting a specific entity type.
 *
 * Implements validation, payload unwrapping, entity type filtering,
 * not-found handling, standardized logging, and error re-throwing.
 */
export abstract class BaseStorageEntityResultPostProcessor<
  TEvent extends StorageResultEventType = StorageResultEventType,
  TStatus = unknown,
  TResult extends object | boolean = boolean,
> extends BatchPostProcessor<TEvent> {
  constructor(
    redisDriver: Redis,
    options: PostProcessorOptions,
    protected readonly expectedEventType: TEvent,
    protected readonly expectedEntityType: StorageEntityType,
    protected readonly targetStatus: TStatus,
  ) {
    super(redisDriver, options);
  }

  protected override shouldProcess(eventType: TEvent | string): boolean {
    return eventType === this.expectedEventType.toString();
  }

  protected async processEvents(events: BatchEventItem<TEvent>[]): Promise<void> {
    for (const { event, messageId } of events) {
      const rawPayload = event.payload as
        | { after?: IStorageFileEntityPayload }
        | null
        | undefined;
      const payload = rawPayload?.after;

      if (!payload?.fileId || !payload.entityId) {
        this.logger.error(
          `Invalid payload for ${String(this.expectedEventType)}: missing required fields`,
          {
            messageId,
            payload: event.payload,
          },
        );
        continue;
      }

      if (payload.entityType !== this.expectedEntityType) {
        this.logger.debug(
          `Ignoring storage event for non-${this.expectedEntityType.toLowerCase()} entity: ${String(payload.entityType)}`,
          {
            messageId,
            fileId: payload.fileId,
            entityId: payload.entityId,
            entityType: payload.entityType,
          },
        );
        continue;
      }

      try {
        const updated = await this.applyResult(
          payload.entityId,
          payload.fileId,
          this.targetStatus,
          payload,
        );

        if (!updated) {
          this.logger.warn(
            `Entity not found when applying storage result for ${this.expectedEntityType} ${payload.entityId}`,
            {
              messageId,
              entityId: payload.entityId,
              fileId: payload.fileId,
            },
          );
          continue;
        }

        await this.onSuccess(
          payload.entityId,
          payload.fileId,
          updated,
          messageId,
        );
      } catch (error) {
        this.logger.error(
          `Failed to apply storage result status for ${this.expectedEntityType} ${payload.entityId}`,
          error,
          {
            messageId,
            entityId: payload.entityId,
            fileId: payload.fileId,
            status: this.targetStatus,
          },
        );
        throw error;
      }
    }
  }

  /**
   * Domain-specific handler to update the entity status with the storage result.
   * Return null/false/undefined if the target entity is not found.
   */
  protected abstract applyResult(
    entityId: string,
    fileId: string,
    status: TStatus,
    payload: IStorageFileEntityPayload,
  ): Promise<TResult | null | undefined>;

  /**
   * Optional hook called after a successful update.
   * Can be overridden to detect race conditions or emit additional logs.
   */
  protected onSuccess(
    entityId: string,
    fileId: string,
    _result: TResult,
    messageId: string,
  ): Promise<void> | void {
    this.logger.info(
      `Successfully applied storage result status for ${this.expectedEntityType} ${entityId} and file ${fileId}`,
      {
        messageId,
        entityId,
        fileId,
        status: this.targetStatus,
      },
    );
  }
}
