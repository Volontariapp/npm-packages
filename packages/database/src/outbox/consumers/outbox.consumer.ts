import { InvalidOutboxSizeError } from '@volontariapp/errors';
import type { BaseRepository } from '../../core/base.repository.js';
import type { OutboxEntity } from '../entities/outbox.entity.js';
import { OutboxStatus } from '../types/outbox.status.js';
import type { OutboxModel } from '../models/outbox.model.js';
import type { Logger } from '@volontariapp/logger';
import type { OutboxDispatcher } from '../dispatchers/outbox.dispatcher.js';
import type { OutboxPusher } from '../pushers/outbox.pusher.js';

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

    this.logger.debug('Fetching pending outbox items', { tableName, batchSize: this.batchSize });

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
              ORDER BY "created_at" ASC
              LIMIT :limit
              FOR UPDATE SKIP LOCKED
            )`,
          { pending: OutboxStatus.PENDING, limit: this.batchSize },
        )
        .returning('*')
        .execute();

      const rawRows = this.normalizeRows(updateResult.raw);

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
        this.logger.info(`Pushing outbox item ${item.id.toString()}`);
        await this.outboxPusher.pushElement(item);
        await this.outboxDispatcher.markAsCompleted(item);
      } catch (error) {
        this.logger.error(`Error pushing outbox item ${item.id.toString()}`, { error });
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
        this.logger.warn(`Skipping outbox item ${item.id.toString()}`, { status: item.status });
        continue;
      }
      await this.outboxDispatcher.markAsCompleted(item);
    }
  }
}
