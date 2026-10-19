import { randomUUID } from 'node:crypto';
import { describe, it, expect, beforeAll, afterAll, beforeEach } from '@jest/globals';
import { RankingListKind, RankingRequestRepository } from '../../index.js';
import { closeTestDb, initializeTestDb, testDataSource, truncateAll } from '../data-source.js';

const TTL_SECONDS = 120;

describe('Ranking requests (Integration)', () => {
  let requests: RankingRequestRepository;

  beforeAll(async () => {
    await initializeTestDb();
    requests = new RankingRequestRepository(testDataSource);
  });

  afterAll(async () => {
    await closeTestDb();
  });

  beforeEach(async () => {
    await truncateAll();
  });

  const request = (userId: string, force = false, reason = 'WISH_CHANGED') =>
    requests.requestCompute({
      userId,
      listKind: RankingListKind.EVENT,
      reason,
      force,
      ttlSeconds: TTL_SECONDS,
    });

  it('should ask for a job on the first request and return the date with microseconds', async () => {
    const result = await request(randomUUID());

    expect(result.needsJob).toBe(true);
    expect(result.requestedAt).toMatch(/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}\.\d{1,6}/);
  });

  it('should merge a request made during the debounce window: one job only', async () => {
    const userId = randomUUID();

    const first = await request(userId);
    const second = await request(userId);
    const third = await request(userId);

    expect([first.needsJob, second.needsJob, third.needsJob]).toEqual([true, false, false]);
    expect(second.requestedAt > first.requestedAt).toBe(true);
  });

  it('should write a new job when the previous one is older than the delay (probably lost)', async () => {
    const userId = randomUUID();
    await request(userId);
    await testDataSource.query(
      `UPDATE ranking_request SET job_enqueued_at = job_enqueued_at - interval '121 seconds' WHERE user_id = $1`,
      [userId],
    );

    const result = await request(userId);

    expect(result.needsJob).toBe(true);
  });

  it('should force a job for ON_DEMAND and MANUAL even when a recent job exists', async () => {
    const userId = randomUUID();
    await request(userId);

    const forced = await request(userId, true, 'ON_DEMAND');

    expect(forced.needsJob).toBe(true);
  });

  it('should keep a request made after the start of the computation (second computation)', async () => {
    const userId = randomUUID();
    await request(userId);
    const startedAt = await requests.databaseClock();
    await request(userId); // arrives after started_at, before the end of the computation

    const surviving = await requests.completeRequest({
      userId,
      listKind: RankingListKind.EVENT,
      startedAt,
    });

    expect(surviving).not.toBeNull();
    const followUp = await requests.markFollowUpJobEnqueued({
      userId,
      listKind: RankingListKind.EVENT,
    });
    expect(followUp).toBe(surviving);
  });

  it('should delete the request when nothing arrived during the computation', async () => {
    const userId = randomUUID();
    await request(userId);
    const startedAt = await requests.databaseClock();

    const surviving = await requests.completeRequest({
      userId,
      listKind: RankingListKind.EVENT,
      startedAt,
    });

    expect(surviving).toBeNull();
    expect(await request(userId)).toMatchObject({ needsJob: true });
  });

  it('should keep one request per list kind', async () => {
    const userId = randomUUID();

    const events = await request(userId);
    const posts = await requests.requestCompute({
      userId,
      listKind: RankingListKind.POST,
      reason: 'POST_PUBLISHED',
      force: false,
      ttlSeconds: TTL_SECONDS,
    });

    expect(events.needsJob).toBe(true);
    expect(posts.needsJob).toBe(true);
  });

  it('should take the date from the clock of the database and keep the microseconds', async () => {
    const clock = await requests.databaseClock();

    expect(clock).toMatch(/\.\d{1,6}\+/);
  });
});
