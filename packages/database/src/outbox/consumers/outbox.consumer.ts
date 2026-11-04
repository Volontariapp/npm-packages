import { SpanKind } from '@opentelemetry/api';
import { InvalidOutboxSizeError } from '@volontariapp/errors';
import type { BaseRepository } from '../../core/base.repository.js';
import type { OutboxEntity } from '../entities/outbox.entity.js';
import { OutboxStatus } from '../types/outbox.status.js';
import type { OutboxModel } from '../models/outbox.model.js';
import type { Logger } from '@volontariapp/logger';
import type { OutboxDispatcher } from '../dispatchers/outbox.dispatcher.js';
import type { OutboxPusher } from '../pushers/outbox.pusher.js';
import { runInTraceContext } from '../utils/run-in-trace-context.js';

export class OutboxConsumer<TOutboxModel extends OutboxModel, TOutboxEntity extends OutboxEntity> {
  constructor(
    protected readonly logger: Logger,
    protected readonly repository: BaseRepository<TOutboxModel, TOutboxEntity, string>,
    protected readonly batchSize: number,
    protected readonly outboxDispatcher: OutboxDispatcher<TOutboxModel, TOutboxEntity>,
    protected readonly outboxPusher: OutboxPusher<TOutboxEntity>,
  ) {
    if (this.batchSize <= 0) {
      throw new InvalidOutboxSizeError();
    }
  }

  async fetchPendingItems(): Promise<TOutboxEntity[]> {
    const tableName = this.repository.metadata.tableName;

    this.logger.verbose('Fetching pending outbox items', { tableName, batchSize: this.batchSize });

    return this.repository.executeInTransaction(async (queryRunner) => {
      const updateResult = await queryRunner.manager
        .createQueryBuilder(this.repository.metadata.target, 'outbox')
        .update()
        .set({
          status: OutboxStatus.PROCESSING,
          updatedAt: () => 'NOW()',
        })
        .where(
          `id IN (
              SELECT "id"
              FROM "${tableName}"
              WHERE "status" = :pending
              ORDER BY "created_at" ASC, "id" ASC
              LIMIT :limit
              FOR UPDATE SKIP LOCKED
            )`,
          { pending: OutboxStatus.PENDING, limit: this.batchSize },
        )
        .returning('*')
        .execute();

      // The ORDER BY of the sub-select picks the batch but does not order `UPDATE ... RETURNING`:
      // sort the claimed rows with the same key so a batch is pushed in write order (a deletion
      // pushed before the creation of the same entity was seen in the E2E scenarios).
      const rawRows = this.sortByCreation(this.normalizeRows(updateResult.raw));

      if (rawRows.length === 0) {
        this.logger.debug('No pending outbox items found', { tableName });
        return [];
      }

      this.logger.info(`Fetched ${rawRows.length.toString()} pending outbox items`, {
        tableName,
        ids: rawRows.map((row) => row.id),
      });

      return this.repository.toEntities(rawRows);
    });
  }

  /**
   * Oldest first, then by id: the same key as the ORDER BY of the claim. JavaScript dates keep
   * milliseconds only, so rows written within the same millisecond are ordered by id, not by
   * write order. `createdAt` is wrapped in `new Date` because a raw row may carry an ISO string
   * when the pg type parser is overridden, even though the model types it as a Date.
   */
  private sortByCreation(rows: TOutboxModel[]): TOutboxModel[] {
    const createdAtMs = (row: TOutboxModel): number => new Date(row.createdAt).getTime();
    return [...rows].sort((a, b) => createdAtMs(a) - createdAtMs(b) || a.id.localeCompare(b.id));
  }

  private normalizeRows(result: unknown): TOutboxModel[] {
    let data: Record<string, unknown>[];

    if (this.isRawResult(result)) {
      data = result.rows;
    } else if (Array.isArray(result)) {
      data = result as Record<string, unknown>[];
    } else {
      return [];
    }

    return data.map((row) => {
      const entries = Object.entries(row).map(([key, value]) => {
        const camelKey = key.replace(/_([a-z])/g, (_, letter: string) => letter.toUpperCase());
        return [camelKey, value] as [string, unknown];
      });

      return Object.fromEntries(entries) as unknown as TOutboxModel;
    });
  }

  private isRawResult(result: unknown): result is { rows: Record<string, unknown>[] } {
    return (
      result !== null &&
      typeof result === 'object' &&
      'rows' in result &&
      Array.isArray((result as Record<string, unknown>).rows)
    );
  }

  async processItems(entities: TOutboxEntity[]): Promise<void> {
    for (const item of entities) {
      try {
        // A child of the trace carried by the row, so the hop through the outbox (and the
        // wait since the row was written) shows up in the trace of the request that caused it.
        await runInTraceContext(
          {
            traceparent: item.traceparent,
            name: `outbox ${item.type}`,
            kind: SpanKind.PRODUCER,
            attributes: { type: item.type, emitter: item.emitter, 'outbox.id': item.id },
          },
          async () => {
            this.logger.info(`Pushing outbox item ${item.id}`);
            await this.outboxPusher.pushElement(item);
            await this.outboxDispatcher.markAsCompleted(item);
          },
        );
      } catch (error) {
        this.logger.error(`Error pushing outbox item ${item.id}`, { error });
        await this.outboxDispatcher.markAsFailed(
          item,
          error instanceof Error ? error.message : String(error),
        );
      }
    }
  }

  async markItemsAsCompleted(entities: TOutboxEntity[]): Promise<void> {
    this.logger.debug('Marking outbox items as completed', { ids: entities.map((e) => e.id) });
    for (const item of entities) {
      if (item.status !== OutboxStatus.PROCESSING) {
        this.logger.warn(`Skipping outbox item ${item.id}`, { status: item.status });
        continue;
      }
      await this.outboxDispatcher.markAsCompleted(item);
    }
  }
}
