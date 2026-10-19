import type { RankingListKind } from '../enums/index.js';
import type { Queryable } from './sql.js';
import { rowsOf } from './sql.js';

/**
 * SQL of the computation requests, shared by the request repository and by the repositories
 * that replace a list (they close the request in the same transaction).
 */

/** Deletes the request unless a more recent one arrived (`requested_at` after `startedAt`). */
export const completeRequestSql = async (
  executor: Queryable,
  params: { userId: string; listKind: RankingListKind; startedAt: string },
): Promise<string | null> => {
  await executor.query(
    `DELETE FROM ranking_request
     WHERE user_id = $1::uuid AND list_kind = $2::varchar AND requested_at <= $3::timestamptz`,
    [params.userId, params.listKind, params.startedAt],
  );
  const rows = rowsOf<{ requested_at: string }>(
    await executor.query(
      `SELECT requested_at::text AS requested_at FROM ranking_request
       WHERE user_id = $1::uuid AND list_kind = $2::varchar`,
      [params.userId, params.listKind],
    ),
  );
  return rows.at(0)?.requested_at ?? null;
};

/** Marks that a follow-up job was written for the surviving request. */
export const markFollowUpSql = async (
  executor: Queryable,
  params: { userId: string; listKind: RankingListKind },
): Promise<string | null> => {
  const rows = rowsOf<{ requested_at: string }>(
    await executor.query(
      `UPDATE ranking_request SET job_enqueued_at = clock_timestamp()
       WHERE user_id = $1::uuid AND list_kind = $2::varchar
       RETURNING requested_at::text AS requested_at`,
      [params.userId, params.listKind],
    ),
  );
  return rows.at(0)?.requested_at ?? null;
};
