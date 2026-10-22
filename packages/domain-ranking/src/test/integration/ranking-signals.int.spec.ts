import { randomBytes, randomUUID } from 'node:crypto';
import { describe, it, expect, beforeAll, afterAll, beforeEach } from '@jest/globals';
import {
  FeedbackBatchTooLargeException,
  MAX_FEEDBACK_ITEMS,
  decryptLocation,
  encryptLocation,
  roundToKilometer,
} from '../../index.js';
import type {
  PostgresRankingEventFeedbackRepository,
  PostgresRankingEventMentionRepository,
  PostgresRankingEventWishRepository,
  PostgresRankingLikeLogRepository,
  PostgresRankingLocationRepository,
} from '../../index.js';
import {
  buildTestRepositories,
  closeTestDb,
  initializeTestDb,
  testDataSource,
  truncateAll,
} from '../data-source.js';

const minutesAgo = (minutes: number): Date => new Date(Date.now() - minutes * 60_000);
const daysAgo = (days: number): Date => new Date(Date.now() - days * 86_400_000);

describe('Ranking signals (Integration)', () => {
  let feedback: PostgresRankingEventFeedbackRepository;
  let wishes: PostgresRankingEventWishRepository;
  let mentions: PostgresRankingEventMentionRepository;
  let likeLog: PostgresRankingLikeLogRepository;
  let locations: PostgresRankingLocationRepository;

  beforeAll(async () => {
    await initializeTestDb();
    ({ feedback, wishes, mentions, likeLog, locations } = buildTestRepositories());
  });

  afterAll(async () => {
    await closeTestDb();
  });

  beforeEach(async () => {
    await truncateAll();
  });

  describe('PASS feedback', () => {
    it('should accept a batch of 50 and refuse a batch of 51', async () => {
      const userId = randomUUID();
      const fifty = Array.from({ length: MAX_FEEDBACK_ITEMS }, () => randomUUID());

      expect(await feedback.recordPasses(userId, fifty)).toBe(50);
      await expect(feedback.recordPasses(userId, [...fifty, randomUUID()])).rejects.toThrow(
        FeedbackBatchTooLargeException,
      );
    });

    it('should be idempotent: replaying a batch does not duplicate', async () => {
      const userId = randomUUID();
      const ids = [randomUUID(), randomUUID()];

      await feedback.recordPasses(userId, ids);
      await feedback.recordPasses(userId, ids);

      expect(await feedback.listRecentPassedEventIds(userId, 30)).toHaveLength(2);
    });

    it('should ignore malformed ids', async () => {
      expect(await feedback.recordPasses(randomUUID(), ['nope', randomUUID()])).toBe(1);
    });

    it('should only return the passes of the cooldown window', async () => {
      const userId = randomUUID();
      const old = randomUUID();
      const recent = randomUUID();
      await feedback.recordPasses(userId, [old, recent]);
      await testDataSource.query(
        `UPDATE ranking_event_feedback SET created_at = now() - interval '31 days' WHERE event_id = $1`,
        [old],
      );

      expect(await feedback.listRecentPassedEventIds(userId, 30)).toEqual([recent]);
    });

    it('should count the passes per event across users', async () => {
      const event = randomUUID();
      await feedback.recordPasses(randomUUID(), [event]);
      await feedback.recordPasses(randomUUID(), [event]);

      expect((await feedback.countPasses([event])).get(event)).toBe(2);
    });
  });

  describe('wishes', () => {
    it('should count each user once, even when a stream message is replayed', async () => {
      const event = randomUUID();
      const user = randomUUID();

      await wishes.add(user, event);
      await wishes.add(user, event);
      await wishes.add(randomUUID(), event);

      expect((await wishes.countByEvents([event])).get(event)).toBe(2);
    });

    it('should remove a wish and tolerate removing it twice', async () => {
      const event = randomUUID();
      const user = randomUUID();
      await wishes.add(user, event);

      await wishes.removeWish(user, event);
      await wishes.removeWish(user, event);

      expect((await wishes.countByEvents([event])).get(event)).toBeUndefined();
    });
  });

  describe('mentions', () => {
    it('should count the distinct authors, not the posts', async () => {
      const event = randomUUID();
      const author = randomUUID();
      await mentions.add({ postId: randomUUID(), eventId: event, authorId: author });
      await mentions.add({ postId: randomUUID(), eventId: event, authorId: author });
      await mentions.add({ postId: randomUUID(), eventId: event, authorId: randomUUID() });

      expect((await mentions.countDistinctAuthors([event], 14)).get(event)).toBe(2);
    });

    it('should forget a deleted post and ignore a replayed one', async () => {
      const event = randomUUID();
      const postId = randomUUID();
      const mention = { postId, eventId: event, authorId: randomUUID() };
      await mentions.add(mention);
      await mentions.add(mention);

      await mentions.removeByPost(postId);

      expect((await mentions.countDistinctAuthors([event], 14)).get(event)).toBeUndefined();
    });

    it('should only count the posts of the buzz window', async () => {
      const event = randomUUID();
      const postId = randomUUID();
      await mentions.add({ postId, eventId: event, authorId: randomUUID() });
      await testDataSource.query(
        `UPDATE ranking_event_mention SET created_at = now() - interval '15 days' WHERE post_id = $1`,
        [postId],
      );

      expect((await mentions.countDistinctAuthors([event], 14)).get(event)).toBeUndefined();
    });
  });

  describe('like log', () => {
    it('should record a like and list it newest first', async () => {
      const userId = randomUUID();
      const older = randomUUID();
      const newer = randomUUID();
      await likeLog.recordLike({ userId, postId: older, occurredAt: minutesAgo(30) });
      await likeLog.recordLike({ userId, postId: newer, occurredAt: minutesAgo(5) });

      const active = await likeLog.listActive(userId, 10);

      expect(active.map((like) => like.postId)).toEqual([newer, older]);
    });

    it('should hide an unliked post', async () => {
      const userId = randomUUID();
      const postId = randomUUID();
      await likeLog.recordLike({ userId, postId, occurredAt: minutesAgo(10) });

      await likeLog.recordUnlike({ userId, postId, at: minutesAgo(5) });

      expect(await likeLog.listActive(userId, 10)).toEqual([]);
    });

    it('should keep the tombstone when an unlike arrives before its like', async () => {
      const userId = randomUUID();
      const postId = randomUUID();

      await likeLog.recordUnlike({ userId, postId, at: minutesAgo(5) });
      await likeLog.recordLike({ userId, postId, occurredAt: minutesAgo(10) });

      expect(await likeLog.listActive(userId, 10)).toEqual([]);
    });

    it('should revive a like made after an unlike', async () => {
      const userId = randomUUID();
      const postId = randomUUID();
      await likeLog.recordLike({ userId, postId, occurredAt: minutesAgo(20) });
      await likeLog.recordUnlike({ userId, postId, at: minutesAgo(10) });

      await likeLog.recordLike({ userId, postId, occurredAt: minutesAgo(2) });

      expect((await likeLog.listActive(userId, 10)).map((like) => like.postId)).toEqual([postId]);
    });

    it('should ignore an unlike older than the like', async () => {
      const userId = randomUUID();
      const postId = randomUUID();
      await likeLog.recordLike({ userId, postId, occurredAt: minutesAgo(5) });

      await likeLog.recordUnlike({ userId, postId, at: minutesAgo(20) });

      expect(await likeLog.listActive(userId, 10)).toHaveLength(1);
    });

    it('should not move a like back in time when an older like is replayed', async () => {
      const userId = randomUUID();
      const postId = randomUUID();
      await likeLog.recordLike({ userId, postId, occurredAt: minutesAgo(2) });

      await likeLog.recordLike({ userId, postId, occurredAt: minutesAgo(60) });

      const [like] = await likeLog.listActive(userId, 10);
      expect(Date.now() - like.occurredAt.getTime()).toBeLessThan(5 * 60_000);
    });

    describe('reconciliation with the graph', () => {
      it('should tombstone a journal like missing from a complete graph answer', async () => {
        const userId = randomUUID();
        const kept = randomUUID();
        const lost = randomUUID();
        await likeLog.recordLike({ userId, postId: kept, occurredAt: minutesAgo(10) });
        await likeLog.recordLike({ userId, postId: lost, occurredAt: minutesAgo(10) });

        const result = await likeLog.reconcileWithGraph({
          userId,
          graphPostIds: [kept],
          graphIsComplete: true,
          fallbackAt: daysAgo(30),
        });

        expect(result.tombstoned).toBe(1);
        expect((await likeLog.listActive(userId, 10)).map((like) => like.postId)).toEqual([kept]);
      });

      it('should not tombstone anything when the graph answer is capped', async () => {
        const userId = randomUUID();
        const old = randomUUID();
        await likeLog.recordLike({ userId, postId: old, occurredAt: minutesAgo(10) });

        const result = await likeLog.reconcileWithGraph({
          userId,
          graphPostIds: [randomUUID()],
          graphIsComplete: false,
          fallbackAt: daysAgo(30),
        });

        expect(result.tombstoned).toBe(0);
        expect((await likeLog.listActive(userId, 10)).map((like) => like.postId)).toContain(old);
      });

      it('should add a graph like missing from the journal with the fallback date', async () => {
        const userId = randomUUID();
        const fromGraph = randomUUID();

        const result = await likeLog.reconcileWithGraph({
          userId,
          graphPostIds: [fromGraph],
          graphIsComplete: true,
          fallbackAt: daysAgo(30),
        });

        expect(result.backfilled).toBe(1);
        const [like] = await likeLog.listActive(userId, 10);
        expect(like.postId).toBe(fromGraph);
        expect(Date.now() - like.occurredAt.getTime()).toBeGreaterThan(
          29 * 86_400_000,
        );
      });

      it('should revive a tombstoned like the graph still knows, and keep a live one untouched', async () => {
        const userId = randomUUID();
        const live = randomUUID();
        const revived = randomUUID();
        await likeLog.recordLike({ userId, postId: live, occurredAt: minutesAgo(3) });
        await likeLog.recordLike({ userId, postId: revived, occurredAt: minutesAgo(30) });
        await likeLog.recordUnlike({ userId, postId: revived, at: minutesAgo(20) });

        await likeLog.reconcileWithGraph({
          userId,
          graphPostIds: [live, revived],
          graphIsComplete: true,
          fallbackAt: daysAgo(30),
        });

        const active = await likeLog.listActive(userId, 10);
        expect(active.map((like) => like.postId).sort()).toEqual([live, revived].sort());
        const liveLike = active.find((like) => like.postId === live);
        expect(Date.now() - (liveLike?.occurredAt.getTime() ?? 0)).toBeLessThan(10 * 60_000);
      });
    });
  });

  describe('location', () => {
    it('should store only the encrypted position and read it back for its owner', async () => {
      const userId = randomUUID();
      const key = randomBytes(32);
      const paris = { lat: 48.856614, lng: 2.352222 };

      await locations.save(userId, encryptLocation(userId, paris, key));
      const stored = await locations.findByUser(userId);

      expect(stored).not.toBeNull();
      expect(stored?.encrypted.toString('utf8')).not.toContain('48.85');
      expect(decryptLocation(userId, stored?.encrypted ?? Buffer.alloc(0), key)).toEqual(
        roundToKilometer(paris),
      );
    });

    it('should replace the previous position', async () => {
      const userId = randomUUID();
      const key = randomBytes(32);
      await locations.save(userId, encryptLocation(userId, { lat: 1, lng: 1 }, key));

      await locations.save(userId, encryptLocation(userId, { lat: 2, lng: 2 }, key));

      const stored = await locations.findByUser(userId);
      expect(decryptLocation(userId, stored?.encrypted ?? Buffer.alloc(0), key).lat).toBeCloseTo(2, 1);
      expect(await testDataSource.query(`SELECT count(*)::int AS total FROM ranking_user_location`)).toEqual([
        { total: 1 },
      ]);
    });

    it('should answer null without position', async () => {
      expect(await locations.findByUser(randomUUID())).toBeNull();
    });
  });

  describe('account purge', () => {
    it('should remove every row of the user and nothing of the others', async () => {
      const repositories = buildTestRepositories();
      const user = randomUUID();
      const other = randomUUID();
      const key = randomBytes(32);
      const seed = async (userId: string): Promise<void> => {
        await repositories.requests.requestCompute({ userId, listKind: 'EVENT', reason: 'USER_CREATED', force: false, ttlSeconds: 120 });
        await repositories.scores.replaceList({
          userId,
          startedAt: await repositories.requests.databaseClock(),
          items: [{ eventId: randomUUID(), score: 0.5, structuralScore: 0.5, semanticScore: null, rank: 1, reasons: [] }],
          run: { source: 'STRUCTURAL_ONLY', formulaVersion: 1, reason: 'ON_DEMAND', candidateCount: 1, jevScoredCount: 0, durationMs: 1 },
        });
        await repositories.postScores.replaceList({
          userId,
          startedAt: await repositories.requests.databaseClock(),
          items: [{ postId: randomUUID(), authorId: randomUUID(), origin: 'FOLLOWED', score: 0.5, structuralScore: 0.5, semanticScore: null, rank: 1, reasons: [] }],
          run: { source: 'FULL', formulaVersion: 1, reason: 'ON_DEMAND', candidateCount: 1, jevScoredCount: 0, durationMs: 1 },
        });
        await repositories.requests.requestCompute({ userId, listKind: 'POST', reason: 'ON_DEMAND', force: true, ttlSeconds: 120 });
        await repositories.likeLog.recordLike({ userId, postId: randomUUID(), occurredAt: new Date() });
        await repositories.feedback.recordPasses(userId, [randomUUID()]);
        await repositories.wishes.add(userId, randomUUID());
        await repositories.mentions.add({ postId: randomUUID(), eventId: randomUUID(), authorId: userId });
        await repositories.locations.save(userId, encryptLocation(userId, { lat: 1, lng: 1 }, key));
        await repositories.buckets.tryConsumeRefresh(userId);
      };
      await seed(user);
      await seed(other);

      const report = await repositories.purge.purgeUser(user);

      expect(report).toMatchObject({
        ranking_score: 1,
        ranking_post_score: 1,
        ranking_run: 2,
        ranking_request: 1,
        ranking_like_log: 1,
        ranking_event_feedback: 1,
        ranking_event_wish: 1,
        ranking_event_mention: 1,
        ranking_user_location: 1,
        ranking_rate_bucket: 1,
      });
      const tables = [
        'ranking_score',
        'ranking_post_score',
        'ranking_run',
        'ranking_request',
        'ranking_like_log',
        'ranking_event_feedback',
        'ranking_event_wish',
        'ranking_user_location',
        'ranking_rate_bucket',
      ];
      for (const table of tables) {
        const [left] = await testDataSource.query<Array<{ total: number }>>(
          `SELECT count(*)::int AS total FROM ${table} WHERE user_id = $1`,
          [user],
        );
        expect([table, left]).toEqual([table, { total: 0 }]);
      }
      expect(
        await testDataSource.query(`SELECT count(*)::int AS total FROM ranking_event_mention WHERE author_id = $1`, [user]),
      ).toEqual([{ total: 0 }]);
      expect(
        await testDataSource.query(`SELECT count(*)::int AS total FROM ranking_score WHERE user_id = $1`, [other]),
      ).toEqual([{ total: 1 }]);
      expect(
        await testDataSource.query(`SELECT count(*)::int AS total FROM ranking_event_mention WHERE author_id = $1`, [other]),
      ).toEqual([{ total: 1 }]);
    });

    it('should roll back the whole purge when one table fails', async () => {
      const repositories = buildTestRepositories();
      const user = randomUUID();
      await repositories.wishes.add(user, randomUUID());
      await repositories.feedback.recordPasses(user, [randomUUID()]);
      await testDataSource.query('ALTER TABLE ranking_user_location RENAME TO ranking_user_location_tmp');

      try {
        await expect(repositories.purge.purgeUser(user)).rejects.toThrow();
      } finally {
        await testDataSource.query('ALTER TABLE ranking_user_location_tmp RENAME TO ranking_user_location');
      }

      expect(
        await testDataSource.query(`SELECT count(*)::int AS total FROM ranking_event_wish WHERE user_id = $1`, [user]),
      ).toEqual([{ total: 1 }]);
    });
  });
});
