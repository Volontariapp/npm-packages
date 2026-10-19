import { describe, expect, it } from '@jest/globals';
import {
  EventEventMessagingType,
  EventMessagingType,
  EventWebsocketMessagingType,
  JobMessagingType,
  RankingEventMessagingType,
  RankingJobType,
  RankingQueue,
  getEventForJob,
  getWsEventForEvent,
} from '../index.js';
import type { EventRegistry, JobRegistry } from '../index.js';
import {
  buildComputeUserFeedPayload,
  buildComputeUserRankingPayload,
  buildFanoutRankingPayload,
} from './ranking-messaging.factory.js';

describe('Ranking messaging', () => {
  describe('names', () => {
    it('should expose the ranking queues', () => {
      expect(RankingQueue.RANKING).toBe('ranking-queue');
      expect(RankingQueue.FEED).toBe('ranking-feed-queue');
      expect(RankingQueue.FALLBACK_RANKING).toBe('fallback-ranking-queue');
    });

    it('should expose the ranking job types', () => {
      expect(RankingJobType.COMPUTE_USER_RANKING).toBe('ranking.compute_user_ranking');
      expect(RankingJobType.COMPUTE_USER_FEED).toBe('ranking.compute_user_feed');
      expect(RankingJobType.FANOUT_RANKING).toBe('ranking.fanout');
    });

    it('should register the ranking job types in the global registry', () => {
      expect(JobMessagingType.COMPUTE_USER_RANKING).toBe(RankingJobType.COMPUTE_USER_RANKING);
      expect(JobMessagingType.COMPUTE_USER_FEED).toBe(RankingJobType.COMPUTE_USER_FEED);
      expect(JobMessagingType.FANOUT_RANKING).toBe(RankingJobType.FANOUT_RANKING);
    });

    it('should expose the account purge event types', () => {
      expect(RankingEventMessagingType.USER_RANKING_DELETED).toBe('user_ranking.deleted');
      expect(RankingEventMessagingType.USER_RANKING_DELETION_FAILED).toBe(
        'user_ranking.deletion_failed',
      );
      expect(EventMessagingType.USER_RANKING_DELETED).toBe('user_ranking.deleted');
    });
  });

  describe('job to event mapping', () => {
    it('should map the event list computation to RANKING_READY', () => {
      expect(getEventForJob('ranking.compute_user_ranking')).toBe(
        EventEventMessagingType.RANKING_READY,
      );
    });

    it('should map the feed computation to the same RANKING_READY event', () => {
      expect(getEventForJob('ranking.compute_user_feed')).toBe(
        EventEventMessagingType.RANKING_READY,
      );
    });

    it('should not map the fan-out, so that no user is notified', () => {
      expect(() => getEventForJob('ranking.fanout')).toThrow(
        'No event mapping found for job type: ranking.fanout',
      );
    });

    it('should map RANKING_READY to its websocket event', () => {
      expect(getWsEventForEvent(EventEventMessagingType.RANKING_READY)).toBe(
        EventWebsocketMessagingType.RANKING_READY,
      );
    });
  });

  describe('typing', () => {
    it('should type the job payloads and the purge events', () => {
      const ranking: JobRegistry[typeof JobMessagingType.COMPUTE_USER_RANKING] =
        buildComputeUserRankingPayload();
      const feed: JobRegistry[typeof JobMessagingType.COMPUTE_USER_FEED] =
        buildComputeUserFeedPayload();
      const fanout: JobRegistry[typeof JobMessagingType.FANOUT_RANKING] =
        buildFanoutRankingPayload({ trigger: 'POST_CREATED', postId: 'post-1', authorId: 'u-2' });
      const deletion: EventRegistry[typeof RankingEventMessagingType.USER_RANKING_DELETION_FAILED] =
        { userId: 'user-1', errorReason: 'boom' };
      const ready: EventRegistry[typeof EventEventMessagingType.RANKING_READY] = {
        status: 'SUCCESS',
        originalPayload: ranking,
      };

      expect(ranking.userId).toBe('user-1');
      expect(feed.reason).toBe('POST_PUBLISHED');
      expect(fanout.postId).toBe('post-1');
      expect(deletion.errorReason).toBe('boom');
      expect(ready.originalPayload.userId).toBe('user-1');
    });
  });
});
