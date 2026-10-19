import { randomBytes, randomUUID } from 'node:crypto';
import { jest, describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import { BadRequestError } from '@volontariapp/errors';
import {
  FeedbackBatchTooLargeException,
  InvalidLocationCipherException,
  RankingFeedbackService,
  RankingLikeLogService,
  RankingLocationService,
  RankingMentionService,
  RankingPostScoreService,
  RankingRateLimitService,
  RankingRequestService,
  RankingRunService,
  RankingScoreService,
  RankingWishService,
  encryptLocation,
  roundToKilometer,
} from '../../index.js';
import {
  createFeedbackRepositoryMock,
  createLikeLogRepositoryMock,
  createLocationRepositoryMock,
  createMentionRepositoryMock,
  createPostScoreRepositoryMock,
  createRateBucketRepositoryMock,
  createRequestRepositoryMock,
  createRunRepositoryMock,
  createScoreRepositoryMock,
  createWishRepositoryMock,
} from '../__test-utils__/mocks/ranking-repositories.mock.js';
import { RankingFactory } from '../__test-utils__/factories/ranking.factory.js';

const USER = randomUUID();
const EVENT = randomUUID();

describe('Ranking services (Unit)', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('RankingRequestService', () => {
    let repository: ReturnType<typeof createRequestRepositoryMock>;
    let service: RankingRequestService;

    beforeEach(() => {
      repository = createRequestRepositoryMock();
      service = new RankingRequestService(repository);
    });

    it('should delegate the request to the repository', async () => {
      const spy = jest
        .spyOn(repository, 'requestCompute')
        .mockResolvedValue({ requestedAt: '2026-10-19 10:00:00.123456+00', needsJob: true });
      const params = { userId: USER, listKind: 'EVENT' as const, reason: 'ON_DEMAND', force: true, ttlSeconds: 120 };

      await expect(service.requestCompute(params)).resolves.toEqual({
        requestedAt: '2026-10-19 10:00:00.123456+00',
        needsJob: true,
      });
      expect(spy).toHaveBeenCalledWith(params, undefined);
    });

    it('should turn an unexpected failure into a database error', async () => {
      jest.spyOn(repository, 'databaseClock').mockRejectedValue(new Error('connection lost'));

      await expect(service.databaseClock()).rejects.toMatchObject({ code: 'DATABASE_ERROR' });
    });
  });

  describe('RankingRunService', () => {
    it('should delegate the freshness and the coalescence checks', async () => {
      const repository = createRunRepositoryMock();
      const service = new RankingRunService(repository);
      jest.spyOn(repository, 'freshness').mockResolvedValue('STALE');
      jest.spyOn(repository, 'isUpToDate').mockResolvedValue(true);
      jest.spyOn(repository, 'findByKey').mockResolvedValue(RankingFactory.buildRun({ userId: USER }));

      expect(await service.freshness({ userId: USER, listKind: 'EVENT', maxAgeHours: 24, formulaVersion: 1 })).toBe('STALE');
      expect(await service.isUpToDate({ userId: USER, listKind: 'EVENT', requestedAt: 'x', formulaVersion: 1 })).toBe(true);
      expect((await service.findByKey(USER, 'EVENT'))?.userId).toBe(USER);
    });
  });

  describe('RankingScoreService and RankingPostScoreService', () => {
    it('should read a page of the event list', async () => {
      const repository = createScoreRepositoryMock();
      const service = new RankingScoreService(repository);
      const page = { run: RankingFactory.buildRun(), items: [RankingFactory.buildScore()] };
      const spy = jest.spyOn(repository, 'readPage').mockResolvedValue(page);

      await expect(service.readPage({ userId: USER, afterRank: 0, limit: 21 })).resolves.toBe(page);
      expect(spy).toHaveBeenCalledWith({ userId: USER, afterRank: 0, limit: 21 });
    });

    it('should hand the follow-up hook to the repository', async () => {
      const repository = createScoreRepositoryMock();
      const service = new RankingScoreService(repository);
      const spy = jest.spyOn(repository, 'replaceList').mockResolvedValue({ written: true, followUpRequired: false });
      const hook = jest.fn(() => Promise.resolve());
      const params = {
        userId: USER,
        startedAt: '2026-10-19 10:00:00+00',
        items: [],
        run: { source: 'STRUCTURAL_ONLY' as const, formulaVersion: 1, reason: 'ON_DEMAND', candidateCount: 0, jevScoredCount: 0, durationMs: 1 },
      };

      await service.replaceList(params, hook);

      expect(spy).toHaveBeenCalledWith(params, hook);
    });

    it('should wrap a failure of the post feed read', async () => {
      const repository = createPostScoreRepositoryMock();
      jest.spyOn(repository, 'readPage').mockRejectedValue(new Error('boom'));
      const service = new RankingPostScoreService(repository);

      await expect(service.readPage({ userId: USER, afterRank: 0, limit: 21 })).rejects.toMatchObject({
        code: 'DATABASE_ERROR',
      });
    });
  });

  describe('RankingRateLimitService', () => {
    it('should answer true when a token is taken and false when the bucket is empty', async () => {
      const repository = createRateBucketRepositoryMock();
      const service = new RankingRateLimitService(repository);
      jest.spyOn(repository, 'tryConsumeRefresh').mockResolvedValueOnce(true).mockResolvedValueOnce(false);
      jest.spyOn(repository, 'tryConsumeLocation').mockResolvedValue(false);

      expect(await service.allowRefresh(USER)).toBe(true);
      expect(await service.allowRefresh(USER)).toBe(false);
      expect(await service.allowLocationUpdate(USER)).toBe(false);
    });
  });

  describe('RankingFeedbackService', () => {
    it('should let a bad request pass through instead of hiding it as a database error', async () => {
      const repository = createFeedbackRepositoryMock();
      jest.spyOn(repository, 'recordPasses').mockRejectedValue(new FeedbackBatchTooLargeException(51));
      const service = new RankingFeedbackService(repository);

      const failure = await service.recordPasses(USER, []).catch((error: unknown) => error);

      expect(failure).toBeInstanceOf(BadRequestError);
      expect(failure).toMatchObject({ code: 'FEEDBACK_BATCH_TOO_LARGE' });
    });

    it('should list the recent passes and count them per event', async () => {
      const repository = createFeedbackRepositoryMock();
      jest.spyOn(repository, 'listRecentPassedEventIds').mockResolvedValue([EVENT]);
      jest.spyOn(repository, 'countPasses').mockResolvedValue(new Map([[EVENT, 3]]));
      const service = new RankingFeedbackService(repository);

      expect(await service.listRecentPassedEventIds(USER, 30)).toEqual([EVENT]);
      expect((await service.countPasses([EVENT])).get(EVENT)).toBe(3);
    });
  });

  describe('RankingWishService and RankingMentionService', () => {
    it('should add and remove a wish', async () => {
      const repository = createWishRepositoryMock();
      const add = jest.spyOn(repository, 'add').mockResolvedValue();
      const remove = jest.spyOn(repository, 'removeWish').mockResolvedValue();
      const service = new RankingWishService(repository);

      await service.addWish(USER, EVENT);
      await service.removeWish(USER, EVENT);

      expect(add).toHaveBeenCalledWith(USER, EVENT, undefined);
      expect(remove).toHaveBeenCalledWith(USER, EVENT, undefined);
    });

    it('should add and remove a mention and count the distinct authors', async () => {
      const repository = createMentionRepositoryMock();
      const add = jest.spyOn(repository, 'add').mockResolvedValue();
      const remove = jest.spyOn(repository, 'removeByPost').mockResolvedValue();
      jest.spyOn(repository, 'countDistinctAuthors').mockResolvedValue(new Map([[EVENT, 2]]));
      const service = new RankingMentionService(repository);
      const mention = { postId: randomUUID(), eventId: EVENT, authorId: USER };

      await service.addMention(mention);
      await service.removeMention(mention.postId);

      expect(add).toHaveBeenCalledWith(mention, undefined);
      expect(remove).toHaveBeenCalledWith(mention.postId, undefined);
      expect((await service.countDistinctAuthors([EVENT], 14)).get(EVENT)).toBe(2);
    });
  });

  describe('RankingLikeLogService', () => {
    it('should delegate the journal operations', async () => {
      const repository = createLikeLogRepositoryMock();
      const like = jest.spyOn(repository, 'recordLike').mockResolvedValue();
      const unlike = jest.spyOn(repository, 'recordUnlike').mockResolvedValue();
      jest.spyOn(repository, 'listActive').mockResolvedValue([{ postId: EVENT, occurredAt: new Date() }]);
      jest.spyOn(repository, 'reconcileWithGraph').mockResolvedValue({ tombstoned: 1, backfilled: 2 });
      const service = new RankingLikeLogService(repository);

      await service.recordLike({ userId: USER, postId: EVENT, occurredAt: new Date() });
      await service.recordUnlike({ userId: USER, postId: EVENT, at: new Date() });

      expect(like).toHaveBeenCalledTimes(1);
      expect(unlike).toHaveBeenCalledTimes(1);
      expect(await service.listActive(USER, 10)).toHaveLength(1);
      expect(
        await service.reconcileWithGraph({ userId: USER, graphPostIds: [], graphIsComplete: true, fallbackAt: new Date() }),
      ).toEqual({ tombstoned: 1, backfilled: 2 });
    });
  });

  describe('RankingLocationService', () => {
    const key = randomBytes(32);
    const paris = { lat: 48.856614, lng: 2.352222 };

    it('should store the encrypted rounded position and read it back', async () => {
      const repository = createLocationRepositoryMock();
      const save = jest.spyOn(repository, 'save').mockResolvedValue();
      const service = new RankingLocationService(repository);

      await service.savePosition(USER, paris, key);
      const stored = save.mock.calls[0]?.[1];
      jest.spyOn(repository, 'findByUser').mockResolvedValue({ encrypted: stored, updatedAt: new Date() });

      expect(stored.toString('utf8')).not.toContain('48.85');
      expect(await service.findPosition(USER, key)).toEqual(roundToKilometer(paris));
    });

    it('should answer null when the user never sent a position', async () => {
      const repository = createLocationRepositoryMock();
      jest.spyOn(repository, 'findByUser').mockResolvedValue(null);
      const service = new RankingLocationService(repository);

      expect(await service.findPosition(USER, key)).toBeNull();
    });

    it('should refuse a ciphertext that belongs to another user', async () => {
      const repository = createLocationRepositoryMock();
      jest.spyOn(repository, 'findByUser').mockResolvedValue({
        encrypted: encryptLocation(randomUUID(), paris, key),
        updatedAt: new Date(),
      });
      const service = new RankingLocationService(repository);

      await expect(service.findPosition(USER, key)).rejects.toThrow(InvalidLocationCipherException);
    });
  });
});
