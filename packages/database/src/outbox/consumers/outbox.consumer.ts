import { InvalidOutboxSizeError } from '@volontariapp/errors';
import type { BaseRepository } from '../../core/base.repository.js';
import type { OutboxEntity } from '../entities/outbox.entity.js';
import { OutboxStatus } from '../types/outbox.status.js';
import type { OutboxModel } from '../models/outbox.model.js';
import type { Logger } from '@volontariapp/logger';

export class OutboxConsumer<TOutboxModel extends OutboxModel, TOutboxEntity extends OutboxEntity> {
  constructor(
    private readonly logger: Logger,
    protected readonly repository: BaseRepository<TOutboxModel, TOutboxEntity, string>,
    protected readonly batchSize: number,
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
        .returning(['*', '"created_at" AS "createdAt"', '"updated_at" AS "updatedAt"'])
        .execute();

      const rawRows = updateResult.raw as TOutboxModel[];

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

  processItems(): void {
    this.logger.debug('Processing outbox items');
  }

  markItemsAsDispatched(): void {
    this.logger.debug('Marking outbox items as dispatched');
  }
}
