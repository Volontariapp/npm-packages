import type { TransactionManager } from '../sql.js';
import type { RateBucketName } from '../../enums/index.js';
import type { Queryable } from '../sql.js';

export interface IRankingRateBucketRepository {
  /** true when a token was taken (allowed), false when the bucket is empty (limited). */
  tryConsume(
    params: { userId: string; bucket: RateBucketName; capacity: number; windowSeconds: number },
    executor?: Queryable,
  ): Promise<boolean>;
  /** POST /ranking/refresh: 5 per minute, shared by the events and the posts. */
  tryConsumeRefresh(userId: string, executor?: Queryable): Promise<boolean>;
  /** PUT /ranking/location: 1 per minute. */
  tryConsumeLocation(userId: string, executor?: Queryable): Promise<boolean>;
  purgeByUser(userId: string, manager?: TransactionManager): Promise<number>;
}
