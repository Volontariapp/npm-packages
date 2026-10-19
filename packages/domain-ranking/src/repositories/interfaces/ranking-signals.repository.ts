import type { TransactionManager } from '../sql.js';
import type { Queryable } from '../sql.js';

export interface IRankingEventFeedbackRepository {
  /** Records a batch of PASS (50 at most). Replaying a batch only refreshes the dates. */
  recordPasses(userId: string, eventIds: readonly string[], executor?: Queryable): Promise<number>;
  /** Events passed less than `days` ago: removed from the candidates. */
  listRecentPassedEventIds(userId: string, days: number, executor?: Queryable): Promise<string[]>;
  countPasses(eventIds: readonly string[], executor?: Queryable): Promise<Map<string, number>>;
  purgeByUser(userId: string, manager?: TransactionManager): Promise<number>;
}

export interface IRankingEventWishRepository {
  add(userId: string, eventId: string, executor?: Queryable): Promise<void>;
  removeWish(userId: string, eventId: string, executor?: Queryable): Promise<void>;
  countByEvents(eventIds: readonly string[], executor?: Queryable): Promise<Map<string, number>>;
  purgeByUser(userId: string, manager?: TransactionManager): Promise<number>;
}

export interface IRankingEventMentionRepository {
  add(
    mention: { postId: string; eventId: string; authorId: string },
    executor?: Queryable,
  ): Promise<void>;
  removeByPost(postId: string, executor?: Queryable): Promise<void>;
  /** Distinct authors over the window: the popularity counts the authors, not the posts. */
  countDistinctAuthors(
    eventIds: readonly string[],
    windowDays: number,
    executor?: Queryable,
  ): Promise<Map<string, number>>;
  /** Mentions are keyed by author. */
  purgeByUser(userId: string, manager?: TransactionManager): Promise<number>;
}
