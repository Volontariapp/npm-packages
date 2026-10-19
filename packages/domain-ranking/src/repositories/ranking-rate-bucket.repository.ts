import type { DataSource } from 'typeorm';
import {
  BUCKET_WINDOW_SECONDS,
  LOCATION_BUCKET_CAPACITY,
  REFRESH_BUCKET_CAPACITY,
} from '../constants/index.js';
import { RateBucketName } from '../enums/index.js';
import type { Queryable } from './sql.js';
import { rowsOf } from './sql.js';

/**
 * Token buckets in PostgreSQL (no Redis rate limiter exists on the platform). The ::numeric
 * casts are mandatory: without them PostgreSQL infers integers and 5 / 60 is 0, so a bucket
 * would never refill.
 */
export class RankingRateBucketRepository {
  constructor(private readonly dataSource: DataSource) {}

  /** true when a token was taken (allowed), false when the bucket is empty (limited). */
  async tryConsume(
    params: {
      userId: string;
      bucket: RateBucketName;
      capacity: number;
      windowSeconds: number;
    },
    executor: Queryable = this.dataSource.manager,
  ): Promise<boolean> {
    const rows = rowsOf<{ tokens: string }>(
      await executor.query(
        `INSERT INTO ranking_rate_bucket AS b (user_id, bucket, tokens, updated_at)
         VALUES ($1::uuid, $2::varchar, $3::numeric - 1, now())
         ON CONFLICT (user_id, bucket) DO UPDATE
           SET tokens = LEAST($3::numeric, b.tokens + EXTRACT(EPOCH FROM (now() - b.updated_at)) * ($3::numeric / $4::numeric)) - 1,
               updated_at = now()
           WHERE LEAST($3::numeric, b.tokens + EXTRACT(EPOCH FROM (now() - b.updated_at)) * ($3::numeric / $4::numeric)) >= 1
         RETURNING tokens`,
        [params.userId, params.bucket, params.capacity, params.windowSeconds],
      ),
    );
    return rows.length > 0;
  }

  /** POST /ranking/refresh: 5 per minute, shared by the events and the posts. */
  tryConsumeRefresh(userId: string, executor?: Queryable): Promise<boolean> {
    return this.tryConsume(
      {
        userId,
        bucket: RateBucketName.REFRESH,
        capacity: REFRESH_BUCKET_CAPACITY,
        windowSeconds: BUCKET_WINDOW_SECONDS,
      },
      executor,
    );
  }

  /** PUT /ranking/location: 1 per minute. */
  tryConsumeLocation(userId: string, executor?: Queryable): Promise<boolean> {
    return this.tryConsume(
      {
        userId,
        bucket: RateBucketName.LOCATION,
        capacity: LOCATION_BUCKET_CAPACITY,
        windowSeconds: BUCKET_WINDOW_SECONDS,
      },
      executor,
    );
  }
}
