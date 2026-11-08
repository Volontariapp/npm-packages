import { InvalidOutboxSizeError } from '@volontariapp/errors';
import type { Logger } from '@volontariapp/logger';
import type { QueryRunner } from 'typeorm';
import { OutboxStatus } from '../types/outbox.status.js';

export interface OutboxPurgeStore {
  readonly metadata: { readonly tableName: string };
  executeInTransaction<TResult>(work: (queryRunner: QueryRunner) => Promise<TResult>): Promise<TResult>;
}

export interface OutboxPurgerOptions {
  /** COMPLETED rows created longer ago than this (in milliseconds) are deleted. */
  retentionMs: number;
  /** Maximum number of rows deleted by one statement. */
  batchSize: number;
  /**
   * Other tables that follow the same rule (they need `id`, `status` and `created_at` columns),
   * for example `job_audit` next to `jobs_outbox`.
   */
  additionalTables?: string[];
}

/** Number of rows deleted, per table. */
export type OutboxPurgeReport = Record<string, number>;

const PLAIN_IDENTIFIER = /^[a-z_][a-z0-9_]*$/;

/**
 * Deletes the COMPLETED rows of an outbox table once they are older than the retention.
 *
 * Only COMPLETED rows are ever touched: PENDING, PROCESSING and FAILED rows are kept because
 * they are either still to be sent or worth investigating. Deletes run in small batches, each
 * in its own transaction, so a large backlog never holds a long lock. The oldest rows go first,
 * which the `(status, created_at, id)` index serves directly.
 */
export class OutboxPurger {
  private readonly tables: string[];

  constructor(
    private readonly logger: Logger,
    private readonly store: OutboxPurgeStore,
    private readonly options: OutboxPurgerOptions,
  ) {
    if (options.batchSize <= 0) {
      throw new InvalidOutboxSizeError('Outbox purge batch size must be greater than 0');
    }
    this.tables = [store.metadata.tableName, ...(options.additionalTables ?? [])];
    for (const table of this.tables) {
      if (!PLAIN_IDENTIFIER.test(table)) {
        throw new TypeError(`Invalid table identifier for the outbox purge: ${table}`);
      }
    }
  }

  async purgeCompleted(): Promise<OutboxPurgeReport> {
    const report: OutboxPurgeReport = {};
    for (const table of this.tables) {
      report[table] = await this.purgeTable(table);
    }
    return report;
  }

  private async purgeTable(table: string): Promise<number> {
    let total = 0;
    let deleted: number;
    do {
      deleted = await this.deleteBatch(table);
      total += deleted;
    } while (deleted >= this.options.batchSize);

    if (total > 0) {
      this.logger.info('Purged completed outbox rows', {
        table,
        deleted: total,
        retentionMs: this.options.retentionMs,
      });
    }
    return total;
  }

  private async deleteBatch(table: string): Promise<number> {
    return this.store.executeInTransaction(async (queryRunner) => {
      const result = await queryRunner.manager
        .createQueryBuilder()
        .delete()
        .from(table)
        .where(
          `"id" IN (
              SELECT "id"
              FROM "${table}"
              WHERE "status" = :completed
                AND "created_at" < NOW() - (CAST(:retentionSeconds AS double precision) * INTERVAL '1 second')
              ORDER BY "created_at" ASC, "id" ASC
              LIMIT :limit
            )`,
          {
            completed: OutboxStatus.COMPLETED,
            retentionSeconds: this.options.retentionMs / 1000,
            limit: this.options.batchSize,
          },
        )
        .execute();
      return result.affected ?? 0;
    });
  }
}
