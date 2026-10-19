import { randomUUID } from 'node:crypto';
import { describe, it, expect, beforeAll, afterAll, beforeEach } from '@jest/globals';
import { RankingRateBucketRepository, RateBucketName } from '../../index.js';
import { closeTestDb, initializeTestDb, testDataSource, truncateAll } from '../data-source.js';

describe('Rate buckets (Integration)', () => {
  let buckets: RankingRateBucketRepository;

  beforeAll(async () => {
    await initializeTestDb();
    buckets = new RankingRateBucketRepository(testDataSource);
  });

  afterAll(async () => {
    await closeTestDb();
  });

  beforeEach(async () => {
    await truncateAll();
  });

  it('should allow five refreshes in a burst and refuse the sixth', async () => {
    const userId = randomUUID();

    const results: boolean[] = [];
    for (let call = 0; call < 6; call += 1) {
      results.push(await buckets.tryConsumeRefresh(userId));
    }

    expect(results).toEqual([true, true, true, true, true, false]);
  });

  it('should refill a token after 12 seconds (capacity 5 over 60 seconds)', async () => {
    const userId = randomUUID();
    for (let call = 0; call < 5; call += 1) await buckets.tryConsumeRefresh(userId);
    expect(await buckets.tryConsumeRefresh(userId)).toBe(false);

    // Twelve seconds without a call: the bucket earns exactly one token.
    await testDataSource.query(
      `UPDATE ranking_rate_bucket SET updated_at = updated_at - interval '12 seconds' WHERE user_id = $1`,
      [userId],
    );

    expect(await buckets.tryConsumeRefresh(userId)).toBe(true);
    expect(await buckets.tryConsumeRefresh(userId)).toBe(false);
  });

  it('should not refill before a full token is earned', async () => {
    const userId = randomUUID();
    for (let call = 0; call < 5; call += 1) await buckets.tryConsumeRefresh(userId);

    await testDataSource.query(
      `UPDATE ranking_rate_bucket SET updated_at = updated_at - interval '6 seconds' WHERE user_id = $1`,
      [userId],
    );

    expect(await buckets.tryConsumeRefresh(userId)).toBe(false);
  });

  it('should never exceed the capacity after a long pause', async () => {
    const userId = randomUUID();
    await buckets.tryConsumeRefresh(userId);
    await testDataSource.query(
      `UPDATE ranking_rate_bucket SET updated_at = updated_at - interval '1 day' WHERE user_id = $1`,
      [userId],
    );

    const results: boolean[] = [];
    for (let call = 0; call < 6; call += 1) {
      results.push(await buckets.tryConsumeRefresh(userId));
    }

    expect(results).toEqual([true, true, true, true, true, false]);
  });

  it('should allow one location update per minute', async () => {
    const userId = randomUUID();

    expect(await buckets.tryConsumeLocation(userId)).toBe(true);
    expect(await buckets.tryConsumeLocation(userId)).toBe(false);
  });

  it('should keep the buckets of the users and of the names apart', async () => {
    const first = randomUUID();
    const second = randomUUID();
    await buckets.tryConsumeLocation(first);

    expect(await buckets.tryConsumeLocation(second)).toBe(true);
    expect(await buckets.tryConsumeRefresh(first)).toBe(true);
  });

  it('should refuse concurrent calls beyond the capacity', async () => {
    const userId = randomUUID();

    const results = await Promise.all(
      Array.from({ length: 10 }, () =>
        buckets.tryConsume({
          userId,
          bucket: RateBucketName.REFRESH,
          capacity: 5,
          windowSeconds: 60,
        }),
      ),
    );

    expect(results.filter(Boolean)).toHaveLength(5);
  });
});
