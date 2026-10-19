import { randomUUID } from 'node:crypto';
import type { DataSource, EntityManager } from 'typeorm';
import {
  FEEDBACK_RETENTION_DAYS,
  LIKE_LOG_RETENTION_DAYS,
  LIKE_TOMBSTONE_RETENTION_DAYS,
} from '../constants/index.js';
import type { PostOrigin, RankingListKind, RankingRunSource } from '../enums/index.js';
import { RankingPostScoreModel, RankingRunModel, RankingScoreModel } from '../models/index.js';
import { RankingRequestRepository } from './ranking-request.repository.js';
import { rowsOf } from './sql.js';

export interface RankedItem {
  /** eventId or postId depending on the list. */
  id: string;
  score: number;
  structuralScore: number;
  semanticScore: number | null;
  rank: number;
  /** Two codes at most. */
  reasons: string[];
}

export interface RankedPostItem extends RankedItem {
  authorId: string;
  origin: PostOrigin;
}

export interface RunSummary {
  source: RankingRunSource;
  formulaVersion: number;
  /** Cause of the computation (RankingComputeReason). */
  reason: string;
  candidateCount: number;
  jevScoredCount: number;
  jevInputTokens?: number;
  jevOutputTokens?: number;
  durationMs: number;
  /** Truncated and masked by the caller. */
  lastError?: string;
}

export interface ReplaceListParams<TItem extends RankedItem> {
  userId: string;
  /** `started_at` of the computation: text from the clock of the database. */
  startedAt: string;
  items: readonly TItem[];
  run: RunSummary;
}

export interface ReplaceListResult {
  /** false when a list computed from a more recent state already exists: nothing was written. */
  written: boolean;
  listVersion?: string;
  /** A request arrived during the computation: the caller must write a follow-up job. */
  followUpRequired: boolean;
  /** `requestedAt` of the follow-up job, when followUpRequired. */
  followUpRequestedAt?: string;
}

/** Runs inside the transaction of the write, after the request was handled. */
export type AfterListWrite = (manager: EntityManager, result: ReplaceListResult) => Promise<void>;

export interface ListPage<TItem extends RankedItem> {
  run: RankingRunModel | null;
  /** Rows after the cursor, ordered by rank: ask for limit + 1 to know hasMore. */
  items: TItem[];
}

interface ScoreRow {
  user_id: string;
  event_id?: string;
  post_id?: string;
  author_id?: string;
  origin?: string;
  score: string;
  structural_score: string;
  semantic_score: string | null;
  rank: number;
  reasons: string[];
}

const toItem = (row: ScoreRow, id: string): RankedItem => ({
  id,
  score: Number(row.score),
  structuralScore: Number(row.structural_score),
  semanticScore: row.semantic_score === null ? null : Number(row.semantic_score),
  rank: row.rank,
  reasons: row.reasons,
});

/**
 * Reads and replaces the lists. A write is one short transaction: a reader sees the old list
 * or the new one, never a mix. The computation (network calls) happens before and outside it.
 */
export class RankingListRepository {
  private readonly requests: RankingRequestRepository;

  constructor(private readonly dataSource: DataSource) {
    this.requests = new RankingRequestRepository(dataSource);
  }

  /** Atomic replacement of the event list of a user, with the anti-overwrite and request rules. */
  replaceEventList(
    params: ReplaceListParams<RankedItem>,
    afterWrite?: AfterListWrite,
  ): Promise<ReplaceListResult> {
    return this.replace(
      'EVENT',
      params,
      async (manager, computedAt) => {
        await manager.query(`DELETE FROM ranking_score WHERE user_id = $1::uuid`, [params.userId]);
        if (params.items.length === 0) return;
        await manager.insert(
          RankingScoreModel,
          params.items.map((item) => ({
            userId: params.userId,
            eventId: item.id,
            score: item.score,
            structuralScore: item.structuralScore,
            semanticScore: item.semanticScore,
            rank: item.rank,
            reasons: item.reasons,
            computedAt,
          })),
        );
      },
      afterWrite,
    );
  }

  /** Atomic replacement of the post feed of a user. */
  replacePostList(
    params: ReplaceListParams<RankedPostItem>,
    afterWrite?: AfterListWrite,
  ): Promise<ReplaceListResult> {
    return this.replace(
      'POST',
      params,
      async (manager, computedAt) => {
        await manager.query(`DELETE FROM ranking_post_score WHERE user_id = $1::uuid`, [
          params.userId,
        ]);
        if (params.items.length === 0) return;
        await manager.insert(
          RankingPostScoreModel,
          params.items.map((item) => ({
            userId: params.userId,
            postId: item.id,
            authorId: item.authorId,
            origin: item.origin,
            score: item.score,
            structuralScore: item.structuralScore,
            semanticScore: item.semanticScore,
            rank: item.rank,
            reasons: item.reasons,
            computedAt,
          })),
        );
      },
      afterWrite,
    );
  }

  private replace<TItem extends RankedItem>(
    listKind: RankingListKind,
    params: ReplaceListParams<TItem>,
    writeItems: (manager: EntityManager, computedAt: string) => Promise<void>,
    afterWrite: AfterListWrite | undefined,
  ): Promise<ReplaceListResult> {
    return this.dataSource.transaction(async (manager) => {
      await manager.query(
        `SELECT pg_advisory_xact_lock(hashtextextended($1::text || ':' || $2::text, 0))`,
        [params.userId, listKind],
      );

      // Anti-overwrite: a slower computation never replaces a list computed from a later state.
      const superseded = rowsOf<{ superseded: boolean }>(
        await manager.query(
          `SELECT started_at >= $3::timestamptz AS superseded
           FROM ranking_run WHERE user_id = $1::uuid AND list_kind = $2::varchar`,
          [params.userId, listKind, params.startedAt],
        ),
      ).at(0)?.superseded;
      if (superseded) return { written: false, followUpRequired: false };

      const computedAt =
        rowsOf<{ now: string }>(await manager.query(`SELECT clock_timestamp()::text AS now`)).at(0)
          ?.now ?? params.startedAt;
      const listVersion = randomUUID();

      await writeItems(manager, computedAt);

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
          listKind,
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
      const surviving = await this.requests.completeRequest(
        { userId: params.userId, listKind, startedAt: params.startedAt },
        manager,
      );
      let followUpRequestedAt: string | undefined;
      if (surviving !== null) {
        followUpRequestedAt =
          (await this.requests.markFollowUpJobEnqueued({ userId: params.userId, listKind }, manager)) ??
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

  /** Opportunistic retention (no scheduler exists), in the transaction of the write. */
  private async retainUserData(userId: string, manager: EntityManager): Promise<void> {
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

  /** Items of the event list after `afterRank` (ask for limit + 1), with the run that produced it. */
  async readEventPage(params: {
    userId: string;
    afterRank: number;
    limit: number;
  }): Promise<ListPage<RankedItem>> {
    const run = await this.dataSource
      .getRepository(RankingRunModel)
      .findOne({ where: { userId: params.userId, listKind: 'EVENT' } });
    if (!run) return { run: null, items: [] };
    const rows = rowsOf<ScoreRow>(
      await this.dataSource.query(
        `SELECT user_id, event_id, score, structural_score, semantic_score, rank, reasons
         FROM ranking_score WHERE user_id = $1::uuid AND rank > $2::integer
         ORDER BY rank LIMIT $3::integer`,
        [params.userId, params.afterRank, params.limit],
      ),
    );
    return { run, items: rows.map((row) => toItem(row, row.event_id ?? '')) };
  }

  async readPostPage(params: {
    userId: string;
    afterRank: number;
    limit: number;
  }): Promise<ListPage<RankedPostItem>> {
    const run = await this.dataSource
      .getRepository(RankingRunModel)
      .findOne({ where: { userId: params.userId, listKind: 'POST' } });
    if (!run) return { run: null, items: [] };
    const rows = rowsOf<ScoreRow>(
      await this.dataSource.query(
        `SELECT user_id, post_id, author_id, origin, score, structural_score, semantic_score, rank, reasons
         FROM ranking_post_score WHERE user_id = $1::uuid AND rank > $2::integer
         ORDER BY rank LIMIT $3::integer`,
        [params.userId, params.afterRank, params.limit],
      ),
    );
    return {
      run,
      items: rows.map((row) => ({
        ...toItem(row, row.post_id ?? ''),
        authorId: row.author_id ?? '',
        origin: (row.origin ?? 'GLOBAL') as PostOrigin,
      })),
    };
  }

  /**
   * Persists the new ranks of the unserved events after the PASS penalties were applied (the
   * served ones keep theirs). The list version does not change.
   */
  async updateEventRanks(
    userId: string,
    ranks: ReadonlyArray<{ eventId: string; rank: number }>,
  ): Promise<void> {
    if (ranks.length === 0) return;
    await this.dataSource.query(
      `UPDATE ranking_score s SET rank = v.rank
       FROM (SELECT unnest($2::uuid[]) AS event_id, unnest($3::integer[]) AS rank) v
       WHERE s.user_id = $1::uuid AND s.event_id = v.event_id`,
      [userId, ranks.map((entry) => entry.eventId), ranks.map((entry) => entry.rank)],
    );
  }
}
