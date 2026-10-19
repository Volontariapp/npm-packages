import { describe, it, expect } from '@jest/globals';
import {
  POST_WEIGHTS,
  authorAffinityScore,
  authorSignalScore,
  eventTieScore,
  postScoreComponents,
  recencyScore,
  structuralPostScore,
} from '../../index.js';
import type { PostScoreInput } from '../../index.js';

const build = (overrides: Partial<PostScoreInput> = {}): PostScoreInput => ({
  ageHours: 0,
  eventTie: 'NONE',
  signals: [],
  followed: false,
  friend: false,
  alreadyEngaged: false,
  ...overrides,
});

describe('post score', () => {
  it('should have weights that sum to 1', () => {
    const sum = Object.values(POST_WEIGHTS).reduce((total, weight) => total + weight, 0);

    expect(sum).toBeCloseTo(1, 10);
  });

  describe('event tie', () => {
    it('should be 1 for a future event wished or joined', () => {
      expect(eventTieScore('FUTURE_WISHED')).toBe(1);
      expect(eventTieScore('FUTURE_JOINED')).toBe(1);
    });

    it('should be 0.5 for a past event that was joined and 0 without a tie', () => {
      expect(eventTieScore('PAST_JOINED')).toBe(0.5);
      expect(eventTieScore('NONE')).toBe(0);
    });
  });

  describe('author affinity', () => {
    it('should weigh a comment twice a like', () => {
      const like = authorSignalScore([{ kind: 'LIKE', ageDays: 0 }]);
      const comment = authorSignalScore([{ kind: 'COMMENT', ageDays: 0 }]);

      expect(comment).toBeCloseTo(2 * like, 10);
      expect(like).toBeCloseTo(1 / 6, 10);
    });

    it('should not saturate with one comment and one like', () => {
      const score = authorSignalScore([
        { kind: 'COMMENT', ageDays: 0 },
        { kind: 'LIKE', ageDays: 0 },
      ]);

      expect(score).toBeCloseTo(0.5, 10);
    });

    it('should halve every 14 days', () => {
      const fresh = authorSignalScore([{ kind: 'LIKE', ageDays: 0 }]);
      const old = authorSignalScore([{ kind: 'LIKE', ageDays: 14 }]);

      expect(old).toBeCloseTo(fresh / 2, 10);
    });

    it('should cap the interactions at 1', () => {
      const many = Array.from({ length: 50 }, () => ({ kind: 'COMMENT' as const, ageDays: 0 }));

      expect(authorSignalScore(many)).toBe(1);
    });

    it('should add the follow and friend bonus, capped at 1', () => {
      expect(authorAffinityScore(0, true, false)).toBeCloseTo(0.25, 10);
      expect(authorAffinityScore(0, true, true)).toBeCloseTo(0.4, 10);
      expect(authorAffinityScore(0.9, true, true)).toBe(1);
    });
  });

  describe('recency', () => {
    it('should be 1 for a new post and about one half after 33 hours', () => {
      expect(recencyScore(0)).toBe(1);
      expect(recencyScore(33)).toBeCloseTo(0.5, 1);
      expect(recencyScore(-5)).toBe(1);
    });
  });

  describe('structural score', () => {
    it('should combine the three components with their weights', () => {
      const components = postScoreComponents(
        build({ eventTie: 'FUTURE_WISHED', followed: true, ageHours: 0 }),
      );

      expect(structuralPostScore(components, false)).toBeCloseTo(0.35 + 0.3 * 0.25 + 0.35, 4);
    });

    it('should demote by a single factor of 0.6 a post already liked or commented', () => {
      const components = postScoreComponents(build({ followed: true }));
      const normal = structuralPostScore(components, false);
      const demoted = structuralPostScore(components, true);

      expect(demoted).toBeCloseTo(normal * 0.6, 3);
    });

    it('should stay between 0 and 1', () => {
      const best = postScoreComponents(
        build({
          eventTie: 'FUTURE_JOINED',
          followed: true,
          friend: true,
          signals: Array.from({ length: 20 }, () => ({ kind: 'COMMENT' as const, ageDays: 0 })),
        }),
      );

      expect(structuralPostScore(best, false)).toBeLessThanOrEqual(1);
      expect(structuralPostScore(postScoreComponents(build({ ageHours: 100_000 })), false)).toBe(0);
    });
  });
});
