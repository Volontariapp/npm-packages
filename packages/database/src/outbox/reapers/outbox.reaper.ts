import { InvalidOutboxSizeError } from '@volontariapp/errors';
import type { Logger } from '@volontariapp/logger';
import type { QueryRunner } from 'typeorm';
import { OutboxStatus } from '../types/outbox.status.js';

export interface OutboxReapStore {
  readonly metadata: { readonly tableName: string };
  executeInTransaction<TResult>(work: (queryRunner: QueryRunner) => Promise<TResult>): Promise<TResult>;
}

export interface OutboxReaperOptions {
  /** A PROCESSING row not updated for this long (ms) is put back to PENDING. */
  stuckAfterMs: number;
  /** A FAILED row is retried while `attempts` is below this. */
  maxAttempts: number;
  /** A FAILED row waits `retryBaseMs * 2^attempts` (ms) since its last update. */
  retryBaseMs: number;
  /** Maximum number of rows put back to PENDING by one statement. */
  limit: number;
  /** Only rows created within this delay (ms) are reaped. */
  maxAgeMs: number;
}

export interface OutboxReapReport {
  /** PROCESSING rows put back to PENDING. */
  stuck: number;
  /** FAILED rows put back to PENDING. */
  failed: number;
}

interface ReapedRow {
  id: string;
  previousStatus: OutboxStatus;
}

const PLAIN_IDENTIFIER = /^[a-z_][a-z0-9_]*$/;

/**
 * Puts the rows that a runner left behind back to PENDING, so the next claim sends them again.
 *
 * - A PROCESSING row whose `updated_at` is older than `stuckAfterMs`: the runner that claimed it
 *   died (or lost its connection) before writing the result. The claim sets `updated_at = NOW()`.
 * - A FAILED row with fewer than `maxAttempts` attempts, once `retryBaseMs * 2^attempts` has
 *   passed since its last update.
 *
 * Rows created more than `maxAgeMs` ago are never touched: they go through the explicit
 * `requeue` command (see `OutboxRequeuer`). One statement picks the rows with
 * `FOR UPDATE SKIP LOCKED` and updates them, so several runners can reap the same table.
 *
 * Delivery becomes "at least once": a row reaped while its first push actually went through is
 * pushed twice, which the consumers absorb by their idempotency on the event id.
 */
export class OutboxReaper {
  private readonly table: string;

  constructor(
    private readonly logger: Logger,
    private readonly store: OutboxReapStore,
    private readonly options: OutboxReaperOptions,
  ) {
    if (options.limit <= 0) {
      throw new InvalidOutboxSizeError('Outbox reap limit must be greater than 0');
    }
    this.table = store.metadata.tableName;
    if (!PLAIN_IDENTIFIER.test(this.table)) {
      throw new TypeError(`Invalid table identifier for the outbox reap: ${this.table}`);
    }
  }

  async reap(): Promise<OutboxReapReport> {
    const report: OutboxReapReport = { stuck: 0, failed: 0 };
    let reaped: number;
    do {
      const rows = await this.reapBatch();
      reaped = rows.length;
      if (reaped > 0) {
        const stuck = rows.filter((row) => row.previousStatus === OutboxStatus.PROCESSING);
        report.stuck += stuck.length;
        report.failed += reaped - stuck.length;
        this.logger.warn('Put stuck or failed outbox rows back to PENDING', {
          table: this.table,
          stuck: stuck.length,
          failed: reaped - stuck.length,
          ids: rows.map((row) => row.id),
        });
      }
    } while (reaped >= this.options.limit);
    return report;
  }

  private async reapBatch(): Promise<ReapedRow[]> {
    const table = this.table;
    return this.store.executeInTransaction(async (queryRunner) => {
      const rows: unknown = await queryRunner.query(
        `WITH picked AS (
           SELECT "id", "status"
           FROM "${table}"
           WHERE "created_at" > NOW() - make_interval(secs => $5::double precision)
             AND (
               ("status" = '${OutboxStatus.PROCESSING}'
                 AND "updated_at" < NOW() - make_interval(secs => $1::double precision))
               OR ("status" = '${OutboxStatus.FAILED}'
                 AND "attempts" < $2::int
                 AND "updated_at" < NOW() - make_interval(secs => $3::double precision * power(2, "attempts")))
             )
           ORDER BY "created_at" ASC, "id" ASC
           LIMIT $4::int
           FOR UPDATE SKIP LOCKED
         )
         UPDATE "${table}" AS o
         SET "status" = '${OutboxStatus.PENDING}', "updated_at" = NOW()
         FROM picked
         WHERE o."id" = picked."id"
         RETURNING o."id" AS "id", picked."status" AS "previousStatus"`,
        [
          this.options.stuckAfterMs / 1000,
          this.options.maxAttempts,
          this.options.retryBaseMs / 1000,
          this.options.limit,
          this.options.maxAgeMs / 1000,
        ],
      );
      return this.toReapedRows(rows);
    });
  }

  /**
   * `queryRunner.query` returns the rows for a SELECT but `[rows, affectedCount]` for an
   * UPDATE ... RETURNING on the postgres driver.
   */
  private toReapedRows(result: unknown): ReapedRow[] {
    const rows = Array.isArray(result) && Array.isArray(result[0]) ? result[0] : result;
    return Array.isArray(rows) ? (rows as ReapedRow[]) : [];
  }
}
