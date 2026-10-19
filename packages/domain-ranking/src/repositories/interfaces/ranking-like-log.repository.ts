import type { TransactionManager } from '../sql.js';
import type { LikeOrigin } from '../../enums/index.js';
import type { Queryable } from '../sql.js';

export interface ActiveLike {
  postId: string;
  occurredAt: Date;
}

export interface ReconcileResult {
  tombstoned: number;
  backfilled: number;
}

export interface IRankingLikeLogRepository {
  recordLike(
    params: { userId: string; postId: string; occurredAt: Date; origin?: LikeOrigin },
    executor?: Queryable,
  ): Promise<void>;
  /** An unlike that arrives before its like creates a tombstone: the older like cannot revive it. */
  recordUnlike(
    params: { userId: string; postId: string; at: Date },
    executor?: Queryable,
  ): Promise<void>;
  listActive(userId: string, limit: number, executor?: Queryable): Promise<ActiveLike[]>;
  /**
   * Reconciles the journal with the likes read in the graph. Tombstones are only laid when the
   * graph answer is complete (`graphIsComplete`): a capped answer would delete valid likes.
   */
  reconcileWithGraph(
    params: {
      userId: string;
      graphPostIds: readonly string[];
      graphIsComplete: boolean;
      fallbackAt: Date;
    },
    executor?: Queryable,
  ): Promise<ReconcileResult>;
  purgeByUser(userId: string, manager?: TransactionManager): Promise<number>;
}
