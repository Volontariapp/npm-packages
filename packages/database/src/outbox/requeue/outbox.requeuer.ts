import type { Logger } from '@volontariapp/logger';
import { OutboxStatus } from '../types/outbox.status.js';

/** Minimal shape of a `pg` client or pool, so the requeue needs no TypeORM data source. */
export interface RequeueQueryable {
  query(text: string, values?: unknown[]): Promise<{ rows: { id: string }[] }>;
}

export interface RequeueOptions {
  /** Outbox table, for example `event_queue` or `jobs_outbox`. */
  table: string;
  /** Statuses to put back to PENDING: PROCESSING and FAILED only. */
  statuses: OutboxStatus[];
  /** Only rows created strictly before this instant. */
  createdBefore: Date;
  /** Only rows of these types (`type` column, for example `post.liked`). At least one. */
  types: string[];
  /** Without `apply`, nothing is written: the rows that would be requeued are only listed. */
  apply: boolean;
  /** Why the rows are replayed. Required with `apply`, written in every log line. */
  reason?: string;
  /** Who runs the command, written in every log line. */
  operator: string;
  /** Rows updated by one statement (and logged by one line). Defaults to 100. */
  batchSize?: number;
}

export interface RequeueReport {
  table: string;
  applied: boolean;
  /** Ids of the rows that matched when the command started. */
  matchedIds: string[];
  /** Rows actually put back to PENDING (always 0 without `apply`). */
  requeued: number;
}

export class RequeueOptionsError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'RequeueOptionsError';
  }
}

export const DEFAULT_REQUEUE_BATCH_SIZE = 100;

/** The only statuses a requeue may touch: the rows that were never delivered, or not for sure. */
export const REQUEUEABLE_STATUSES: readonly OutboxStatus[] = [
  OutboxStatus.PROCESSING,
  OutboxStatus.FAILED,
];

const PLAIN_IDENTIFIER = /^[a-z_][a-z0-9_]*$/;

/**
 * Explicit, journaled replay of outbox rows that the automatic reap leaves alone because they are
 * older than `reapMaxAgeMs`. Meant to be run by a human, after reading what the consumers of the
 * type do with a late event.
 *
 * Read-only unless `apply` is set. The matching ids are read once, then put back to PENDING by
 * batches (`attempts` unchanged, `updated_at = NOW()`), each batch restricted again to the same
 * statuses so a row claimed or finished in the meantime is not touched. One `warn` line per batch
 * carries the ids, the reason and the operator.
 */
export class OutboxRequeuer {
  constructor(
    private readonly logger: Logger,
    private readonly db: RequeueQueryable,
  ) {}

  async run(options: RequeueOptions): Promise<RequeueReport> {
    const batchSize = options.batchSize ?? DEFAULT_REQUEUE_BATCH_SIZE;
    this.validate(options, batchSize);

    const { rows } = await this.db.query(
      `SELECT "id" FROM "${options.table}"
       WHERE "status" = ANY($1::text[])
         AND "created_at" < $2::timestamptz
         AND "type" = ANY($3::text[])
       ORDER BY "created_at" ASC, "id" ASC`,
      [options.statuses, options.createdBefore.toISOString(), options.types],
    );
    const matchedIds = rows.map((row) => row.id);
    const report: RequeueReport = {
      table: options.table,
      applied: options.apply,
      matchedIds,
      requeued: 0,
    };

    if (!options.apply) {
      return report;
    }

    for (let start = 0; start < matchedIds.length; start += batchSize) {
      const batch = matchedIds.slice(start, start + batchSize);
      const updated = await this.db.query(
        `UPDATE "${options.table}"
         SET "status" = '${OutboxStatus.PENDING}', "updated_at" = NOW()
         WHERE "id" = ANY($1::uuid[]) AND "status" = ANY($2::text[])
         RETURNING "id"`,
        [batch, options.statuses],
      );
      report.requeued += updated.rows.length;
      this.logger.warn('Requeued outbox rows', {
        table: options.table,
        count: updated.rows.length,
        ids: updated.rows.map((row) => row.id),
        statuses: options.statuses,
        types: options.types,
        reason: options.reason,
        operator: options.operator,
      });
    }
    return report;
  }

  private validate(options: RequeueOptions, batchSize: number): void {
    if (!PLAIN_IDENTIFIER.test(options.table)) {
      throw new RequeueOptionsError(`Invalid table identifier: ${options.table}`);
    }
    if (options.types.length === 0 || options.types.some((type) => type.trim() === '')) {
      throw new RequeueOptionsError('At least one non-empty type is required (--type)');
    }
    if (options.statuses.length === 0) {
      throw new RequeueOptionsError('At least one status is required (--status)');
    }
    const forbidden = options.statuses.filter((status) => !REQUEUEABLE_STATUSES.includes(status));
    if (forbidden.length > 0) {
      throw new RequeueOptionsError(
        `Only ${REQUEUEABLE_STATUSES.join(' and ')} rows can be requeued, got: ${forbidden.join(', ')}`,
      );
    }
    if (Number.isNaN(options.createdBefore.getTime())) {
      throw new RequeueOptionsError('createdBefore is not a valid date (--created-before)');
    }
    if (!Number.isInteger(batchSize) || batchSize <= 0) {
      throw new RequeueOptionsError('The batch size must be a positive integer');
    }
    if (options.apply && (options.reason === undefined || options.reason.trim() === '')) {
      throw new RequeueOptionsError('--reason is required with --apply');
    }
    if (options.operator.trim() === '') {
      throw new RequeueOptionsError('The operator must not be empty (--operator)');
    }
  }
}
