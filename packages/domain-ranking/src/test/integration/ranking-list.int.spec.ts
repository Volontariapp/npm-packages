import { randomUUID } from 'node:crypto';
import { describe, it, expect, beforeAll, afterAll, beforeEach } from '@jest/globals';
import {
  FORMULA_VERSION,
  PostOrigin,
  RankingRunSource,
  buildPage,
  resolveCursor,
} from '../../index.js';
import type {
  PostgresRankingPostScoreRepository,
  PostgresRankingRequestRepository,
  PostgresRankingRunRepository,
  PostgresRankingScoreRepository,
  RankedEventItem,
  RankedPostItem,
  RunSummary,
} from '../../index.js';
import {
  buildTestRepositories,
  closeTestDb,
  initializeTestDb,
  testDataSource,
  truncateAll,
} from '../data-source.js';

const run = (overrides: Partial<RunSummary> = {}): RunSummary => ({
  source: RankingRunSource.STRUCTURAL_ONLY,
  formulaVersion: FORMULA_VERSION,
  reason: 'ON_DEMAND',
  candidateCount: 3,
  jevScoredCount: 0,
  durationMs: 120,
  ...overrides,
});

const items = (count: number): RankedEventItem[] =>
  Array.from({ length: count }, (_, index) => ({
    eventId: randomUUID(),
    score: Math.round((1 - index / (count + 1)) * 10_000) / 10_000,
    structuralScore: Math.round((1 - index / (count + 1)) * 10_000) / 10_000,
    semanticScore: null,
    rank: index + 1,
    reasons: index === 0 ? ['NEAR_YOU', 'TRENDING'] : [],
  }));

describe('Ranking lists (Integration)', () => {
  let scores: PostgresRankingScoreRepository;
  let postScores: PostgresRankingPostScoreRepository;
  let runs: PostgresRankingRunRepository;
  let requests: PostgresRankingRequestRepository;

  beforeAll(async () => {
    await initializeTestDb();
    const repositories = buildTestRepositories();
    scores = repositories.scores;
    postScores = repositories.postScores;
    runs = repositories.runs;
    requests = repositories.requests;
  });

  afterAll(async () => {
    await closeTestDb();
  });

  beforeEach(async () => {
    await truncateAll();
  });

  const writeEvents = async (userId: string, rankedItems: RankedEventItem[], startedAt?: string) =>
    scores.replaceList({
      userId,
      startedAt: startedAt ?? (await requests.databaseClock()),
      items: rankedItems,
      run: run({ candidateCount: rankedItems.length }),
    });

  it('should write the list and the run, and read them back in rank order', async () => {
    const userId = randomUUID();
    const written = items(5);

    const result = await writeEvents(userId, written);
    const page = await scores.readPage({ userId, afterRank: 0, limit: 10 });

    expect(result.written).toBe(true);
    expect(page.items.map((item) => item.eventId)).toEqual(written.map((item) => item.eventId));
    expect(page.items[0]).toMatchObject({ rank: 1, reasons: ['NEAR_YOU', 'TRENDING'], semanticScore: null });
    expect(page.run?.listVersion).toBe(result.listVersion);
    expect(page.run).toMatchObject({ source: 'STRUCTURAL_ONLY', candidateCount: 5, formulaVersion: FORMULA_VERSION });
  });

  it('should replace the previous list entirely and change the list version', async () => {
    const userId = randomUUID();
    const first = await writeEvents(userId, items(5));
    const replacement = items(2);

    const second = await writeEvents(userId, replacement);
    const page = await scores.readPage({ userId, afterRank: 0, limit: 10 });

    expect(second.listVersion).not.toBe(first.listVersion);
    expect(page.items.map((item) => item.eventId)).toEqual(replacement.map((item) => item.eventId));
  });

  it('should write an empty list (no candidate) and keep the run', async () => {
    const userId = randomUUID();

    await writeEvents(userId, []);

    const page = await scores.readPage({ userId, afterRank: 0, limit: 10 });
    expect(page.run).not.toBeNull();
    expect(page.items).toEqual([]);
  });

  it('should return no run for a user without list (cold start)', async () => {
    const page = await scores.readPage({ userId: randomUUID(), afterRank: 0, limit: 10 });

    expect(page.run).toBeNull();
    expect(await runs.freshness({ userId: randomUUID(), listKind: 'EVENT', maxAgeHours: 24, formulaVersion: FORMULA_VERSION })).toBe('MISSING');
  });

  it('should refuse to overwrite a list computed from a later state (anti-overwrite)', async () => {
    const userId = randomUUID();
    const slowStart = await requests.databaseClock();
    const fastStart = await requests.databaseClock();
    const fastItems = items(3);
    await writeEvents(userId, fastItems, fastStart);

    const slow = await writeEvents(userId, items(4), slowStart);

    expect(slow.written).toBe(false);
    const page = await scores.readPage({ userId, afterRank: 0, limit: 10 });
    expect(page.items.map((item) => item.eventId)).toEqual(fastItems.map((item) => item.eventId));
  });

  it('should serialize two simultaneous writes of the same user and keep one complete list', async () => {
    const userId = randomUUID();
    const startA = await requests.databaseClock();
    const startB = await requests.databaseClock();

    await Promise.all([writeEvents(userId, items(3), startA), writeEvents(userId, items(4), startB)]);

    const page = await scores.readPage({ userId, afterRank: 0, limit: 10 });
    expect([3, 4]).toContain(page.items.length);
    expect(page.items.map((item) => item.rank)).toEqual(
      Array.from({ length: page.items.length }, (_, index) => index + 1),
    );
  });

  it('should report a follow-up when a request arrives during the computation', async () => {
    const userId = randomUUID();
    await requests.requestCompute({ userId, listKind: 'EVENT', reason: 'WISH_CHANGED', force: false, ttlSeconds: 120 });
    const startedAt = await requests.databaseClock();
    await requests.requestCompute({ userId, listKind: 'EVENT', reason: 'WISH_CHANGED', force: false, ttlSeconds: 120 });

    const result = await writeEvents(userId, items(2), startedAt);

    expect(result.followUpRequired).toBe(true);
    expect(result.followUpRequestedAt).toBeDefined();
  });

  it('should delete the request when nothing arrived during the computation', async () => {
    const userId = randomUUID();
    await requests.requestCompute({ userId, listKind: 'EVENT', reason: 'USER_CREATED', force: false, ttlSeconds: 120 });

    const result = await writeEvents(userId, items(2));

    expect(result.followUpRequired).toBe(false);
    const left = await testDataSource.query<unknown[]>(
      `SELECT 1 FROM ranking_request WHERE user_id = $1`,
      [userId],
    );
    expect(left).toEqual([]);
  });

  it('should run the follow-up hook in the same transaction: a failure keeps the old list', async () => {
    const userId = randomUUID();
    const initial = items(3);
    await writeEvents(userId, initial);

    await expect(
      scores.replaceList(
        { userId, startedAt: await requests.databaseClock(), items: items(1), run: run() },
        () => Promise.reject(new Error('job write failed')),
      ),
    ).rejects.toThrow('job write failed');

    const page = await scores.readPage({ userId, afterRank: 0, limit: 10 });
    expect(page.items.map((item) => item.eventId)).toEqual(initial.map((item) => item.eventId));
  });

  it('should page by cursor with no overlap and no gap, and detect a new version', async () => {
    const userId = randomUUID();
    const written = await writeEvents(userId, items(45)).then(() => 'ok');
    expect(written).toBe('ok');

    const first = await scores.readPage({ userId, afterRank: 0, limit: 21 });
    const firstPage = buildPage(first.items, 20, first.run?.listVersion ?? '');
    const resolved = resolveCursor(firstPage.nextCursor, first.run?.listVersion ?? '');
    const second = await scores.readPage({ userId, afterRank: resolved.lastRank, limit: 21 });
    const secondPage = buildPage(second.items, 20, first.run?.listVersion ?? '');

    expect([...firstPage.items, ...secondPage.items].map((item) => item.rank)).toEqual(
      Array.from({ length: 40 }, (_, index) => index + 1),
    );
    expect(secondPage.hasMore).toBe(true);

    await writeEvents(userId, items(45));
    const newRun = await runs.findByKey(userId, 'EVENT');
    expect(resolveCursor(firstPage.nextCursor, newRun?.listVersion ?? '').versionChanged).toBe(true);
  });

  it('should persist the new ranks of the unserved events', async () => {
    const userId = randomUUID();
    const written = items(4);
    await writeEvents(userId, written);

    await scores.updateRanks(userId, [
      { eventId: written[3]?.eventId ?? '', rank: 2 },
      { eventId: written[1]?.eventId ?? '', rank: 4 },
    ]);

    const page = await scores.readPage({ userId, afterRank: 0, limit: 10 });
    expect(page.items.map((item) => item.eventId)).toEqual([
      written[0]?.eventId,
      written[3]?.eventId,
      written[2]?.eventId,
      written[1]?.eventId,
    ]);
  });

  describe('post feed', () => {
    it('should write and read the post feed with its authors and origins', async () => {
      const userId = randomUUID();
      const authorId = randomUUID();
      const posts: RankedPostItem[] = items(3).map(({ eventId, ...item }, index) => ({
        ...item,
        postId: eventId,
        authorId,
        origin: index === 2 ? PostOrigin.GLOBAL : PostOrigin.FOLLOWED,
      }));

      await postScores.replaceList({
        userId,
        startedAt: await requests.databaseClock(),
        items: posts,
        run: run({ source: RankingRunSource.COLD_START }),
      });
      const page = await postScores.readPage({ userId, afterRank: 0, limit: 10 });

      expect(page.items.map((item) => [item.postId, item.authorId, item.origin])).toEqual(
        posts.map((item) => [item.postId, authorId, item.origin]),
      );
      expect(page.run?.source).toBe('COLD_START');
    });

    it('should keep the event list and the post feed apart', async () => {
      const userId = randomUUID();
      await writeEvents(userId, items(2));

      const postPage = await postScores.readPage({ userId, afterRank: 0, limit: 10 });

      expect(postPage.run).toBeNull();
    });
  });

  describe('runs', () => {
    it('should skip a job when a list computed after the request exists with the current formula', async () => {
      const userId = randomUUID();
      const requestedAt = await requests.databaseClock();
      await writeEvents(userId, items(2));

      expect(await runs.isUpToDate({ userId, listKind: 'EVENT', requestedAt, formulaVersion: FORMULA_VERSION })).toBe(true);
      expect(await runs.isUpToDate({ userId, listKind: 'EVENT', requestedAt, formulaVersion: FORMULA_VERSION + 1 })).toBe(false);
    });

    it('should not skip a job requested after the last computation started', async () => {
      const userId = randomUUID();
      await writeEvents(userId, items(2));
      const requestedAt = await requests.databaseClock();

      expect(await runs.isUpToDate({ userId, listKind: 'EVENT', requestedAt, formulaVersion: FORMULA_VERSION })).toBe(false);
    });

    it('should not skip a job when there is no list yet', async () => {
      expect(
        await runs.isUpToDate({ userId: randomUUID(), listKind: 'EVENT', requestedAt: await requests.databaseClock(), formulaVersion: FORMULA_VERSION }),
      ).toBe(false);
    });

    it('should serve a stale list instead of removing it', async () => {
      const userId = randomUUID();
      await writeEvents(userId, items(2));
      await testDataSource.query(
        `UPDATE ranking_run SET computed_at = computed_at - interval '25 hours' WHERE user_id = $1`,
        [userId],
      );

      expect(await runs.freshness({ userId, listKind: 'EVENT', maxAgeHours: 24, formulaVersion: FORMULA_VERSION })).toBe('STALE');
      expect(await runs.freshness({ userId, listKind: 'EVENT', maxAgeHours: 48, formulaVersion: FORMULA_VERSION })).toBe('FRESH');
      expect(await runs.freshness({ userId, listKind: 'EVENT', maxAgeHours: 48, formulaVersion: FORMULA_VERSION + 1 })).toBe('STALE');
      expect((await scores.readPage({ userId, afterRank: 0, limit: 10 })).items).toHaveLength(2);
    });

    it('should list the active users by cursor, most recent first, without OFFSET', async () => {
      const users = Array.from({ length: 5 }, () => randomUUID());
      for (const userId of users) await writeEvents(userId, items(1));
      await writeEvents(randomUUID(), []);
      await postScores.replaceList({
        userId: randomUUID(),
        startedAt: await requests.databaseClock(),
        items: [],
        run: run(),
      });

      const first = await runs.listActiveUsers({ listKind: 'EVENT', days: 7, limit: 3 });
      const last = first.at(-1);
      const second = await runs.listActiveUsers({
        listKind: 'EVENT',
        days: 7,
        limit: 3,
        after: last ? { computedAt: last.computedAt, userId: last.userId } : undefined,
      });
      const third = await runs.listActiveUsers({
        listKind: 'EVENT',
        days: 7,
        limit: 3,
        after: second.at(-1),
      });

      const seen = [...first, ...second, ...third].map((entry) => entry.userId);
      expect(first).toHaveLength(3);
      expect(second).toHaveLength(3);
      expect(third).toHaveLength(0);
      expect(new Set(seen).size).toBe(6);
    });

    it('should leave out the users inactive for longer than the window', async () => {
      const userId = randomUUID();
      await writeEvents(userId, items(1));
      await testDataSource.query(
        `UPDATE ranking_run SET computed_at = computed_at - interval '10 days' WHERE user_id = $1`,
        [userId],
      );

      expect(await runs.listActiveUsers({ listKind: 'EVENT', days: 7, limit: 10 })).toEqual([]);
    });
  });
});
