import { randomUUID } from 'node:crypto';
import type { ObjectLiteral } from '@volontariapp/database';
import { BaseRepository } from '@volontariapp/database';
import {
  FEEDBACK_RETENTION_DAYS,
  LIKE_LOG_RETENTION_DAYS,
  LIKE_TOMBSTONE_RETENTION_DAYS,
} from '../constants/index.js';
import { RankingRunEntity } from '../entities/index.js';
import type { RankingListKind } from '../enums/index.js';
import { RankingRunModel } from '../models/index.js';
import type {
  AfterListWrite,
  ReplaceListParams,
  ReplaceListResult,
} from './interfaces/index.js';
import { completeRequestSql, markFollowUpSql } from './request-sql.js';
import type { TransactionManager } from './sql.js';
import { rowsOf } from './sql.js';

/**
 * Common part of the repositories of the two ranked lists. A write is one short transaction:
 * a reader sees the old list or the new one, never a mix. The computation (network calls)
 * happens before and outside it.
 */
export abstract class PostgresRankedListRepository<
  TModel extends ObjectLiteral,
  TEntity extends object,
> extends BaseRepository<TModel, TEntity> {
  protected abstract readonly listKind: RankingListKind;

  /** Deletes the previous list and inserts the new one, inside the transaction of the write. */
  protected abstract writeItems(
    manager: TransactionManager,
    userId: string,
    items: readonly unknown[],
    computedAt: string,
  ): Promise<void>;

  protected replace<TItem>(
    params: ReplaceListParams<TItem>,
    afterWrite: AfterListWrite | undefined,
  ): Promise<ReplaceListResult> {
    return this.executeInTransaction(async (queryRunner) => {
      const manager = queryRunner.manager;
      await manager.query(
        `SELECT pg_advisory_xact_lock(hashtextextended($1::text || ':' || $2::text, 0))`,
        [params.userId, this.listKind],
      );

      // Anti-overwrite: a slower computation never replaces a list computed from a later state.
      const superseded = rowsOf<{ superseded: boolean }>(
        await manager.query(
          `SELECT started_at >= $3::timestamptz AS superseded
           FROM ranking_run WHERE user_id = $1::uuid AND list_kind = $2::varchar`,
          [params.userId, this.listKind, params.startedAt],
        ),
      ).at(0)?.superseded;
      if (superseded) return { written: false, followUpRequired: false };

      const computedAt =
        rowsOf<{ now: string }>(await manager.query(`SELECT clock_timestamp()::text AS now`)).at(0)
          ?.now ?? params.startedAt;
      const listVersion = randomUUID();

      await this.writeItems(manager, params.userId, params.items, computedAt);

      await manager.query(
        `INSERT INTO ranking_run (user_id, list_kind, list_version, started_at, computed_at, source,
           formula_version, reason, candidate_count, jev_scored_count, jev_input_tokens,
           jev_output_tokens, duration_ms, last_error)
         VALUES ($1::uuid, $2::varchar, $3::uuid, $4::timestamptz, $5::timestamptz, $6::varchar,
           $7::integer, $8::varchar, $9::integer, $10::integer, $11::integer, $12::integer,
           $13::integer, $14::text)
         ON CONFLICT (user_id, list_kind) DO UPDATE SET
           list_version = EXCLUDED.list_version, started_at = EXCLUDED.started_at,
           computed_at = EXCLUDED.computed_at, source = EXCLUDED.source,
           formula_version = EXCLUDED.formula_version, reason = EXCLUDED.reason,
           candidate_count = EXCLUDED.candidate_count, jev_scored_count = EXCLUDED.jev_scored_count,
           jev_input_tokens = EXCLUDED.jev_input_tokens, jev_output_tokens = EXCLUDED.jev_output_tokens,
           duration_ms = EXCLUDED.duration_ms, last_error = EXCLUDED.last_error`,
        [
          params.userId,
          this.listKind,
          listVersion,
          params.startedAt,
          computedAt,
          params.run.source,
          params.run.formulaVersion,
          params.run.reason,
          params.run.candidateCount,
          params.run.jevScoredCount,
          params.run.jevInputTokens ?? null,
          params.run.jevOutputTokens ?? null,
          params.run.durationMs,
          params.run.lastError ?? null,
        ],
      );

      // A request made after the start of this computation survives and needs a follow-up job.
      const surviving = await completeRequestSql(manager, {
        userId: params.userId,
        listKind: this.listKind,
        startedAt: params.startedAt,
      });
      let followUpRequestedAt: string | undefined;
      if (surviving !== null) {
        followUpRequestedAt =
          (await markFollowUpSql(manager, { userId: params.userId, listKind: this.listKind })) ??
          undefined;
      }

      await this.retainUserData(params.userId, manager);

      const result: ReplaceListResult = {
        written: true,
        listVersion,
        followUpRequired: surviving !== null,
        followUpRequestedAt,
      };
      if (afterWrite) await afterWrite(manager, result);
      return result;
    });
  }

  /** The run that produced the list, as an entity. */
  protected async findRun(userId: string): Promise<RankingRunEntity | null> {
    const model = await this.repository.manager
      .getRepository(RankingRunModel)
      .findOne({ where: { userId, listKind: this.listKind } });
    return model ? this.mapper.map(model, RankingRunModel, RankingRunEntity) : null;
  }

  /** Opportunistic retention (no scheduler exists), in the transaction of the write. */
  private async retainUserData(userId: string, manager: TransactionManager): Promise<void> {
    await manager.query(
      `DELETE FROM ranking_like_log
       WHERE user_id = $1::uuid
         AND (occurred_at < now() - make_interval(days => $2::integer)
              OR (deleted_at IS NOT NULL AND deleted_at < now() - make_interval(days => $3::integer)))`,
      [userId, LIKE_LOG_RETENTION_DAYS, LIKE_TOMBSTONE_RETENTION_DAYS],
    );
    await manager.query(
      `DELETE FROM ranking_event_feedback
       WHERE user_id = $1::uuid AND created_at < now() - make_interval(days => $2::integer)`,
      [userId, FEEDBACK_RETENTION_DAYS],
    );
    await manager.query(
      `DELETE FROM ranking_rate_bucket WHERE user_id = $1::uuid AND updated_at < now() - interval '1 day'`,
      [userId],
    );
  }
}
