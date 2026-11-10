import { describe, expect, it } from '@jest/globals';
import {
  JobMessagingType,
  SocialEdgeAction,
  SocialEdgeKind,
  SocialJobType,
  SocialQueue,
  getJobDeliveryOptions,
} from '../index.js';
import type { ISocialEdgeApplyPayload, JobRegistry } from '../index.js';

describe('Social edge messaging', () => {
  it('should expose the SOCIAL_EDGE_APPLY job on the social queue', () => {
    expect(SocialJobType.SOCIAL_EDGE_APPLY).toBe('social.edge_apply');
    expect(JobMessagingType.SOCIAL_EDGE_APPLY).toBe('social.edge_apply');
    expect(SocialQueue.SOCIAL).toBe('social-queue');
  });

  it('should type the payload through the job registry', () => {
    const payload: JobRegistry[typeof JobMessagingType.SOCIAL_EDGE_APPLY] = {
      kind: SocialEdgeKind.PARTICIPATE,
      fromId: 'user-1',
      toId: 'event-1',
      action: SocialEdgeAction.ADD,
      intentAt: '2026-11-10T10:00:00.000Z',
      companionKind: SocialEdgeKind.WISH,
    };
    const asPayload: ISocialEdgeApplyPayload = payload;

    expect(asPayload.companionKind).toBe('WISH');
  });

  it('should list the four relation kinds stored in social_edge', () => {
    expect(Object.values(SocialEdgeKind)).toEqual(['LIKE', 'FOLLOW', 'WISH', 'PARTICIPATE']);
  });

  describe('getJobDeliveryOptions', () => {
    it('should give SOCIAL_EDGE_APPLY 12 exponential attempts from 1 s', () => {
      expect(getJobDeliveryOptions(SocialJobType.SOCIAL_EDGE_APPLY)).toEqual({
        attempts: 12,
        backoff: { type: 'exponential', delay: 1000 },
      });
    });

    it('should return nothing for a job type that keeps the queue defaults', () => {
      expect(getJobDeliveryOptions(SocialJobType.FOLLOW_USER)).toBeUndefined();
      expect(getJobDeliveryOptions('unknown.job')).toBeUndefined();
    });
  });
});
