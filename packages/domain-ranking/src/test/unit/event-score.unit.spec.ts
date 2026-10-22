import { describe, it, expect } from '@jest/globals';
import {
  EVENT_WEIGHTS,
  computePopularity,
  eventScoreComponents,
  imminenceScore,
  isWithinRange,
  proximityScore,
  structuralEventScore,
  typeAffinityScore,
} from '../../index.js';
import type { EventScoreInput } from '../../index.js';

const NOW = new Date('2026-10-19T10:00:00Z');
const inDays = (days: number): Date => new Date(NOW.getTime() + days * 86_400_000);

const build = (overrides: Partial<EventScoreInput> = {}): EventScoreInput => ({
  now: NOW,
  startAt: inDays(2),
  distanceKm: 5,
  touchedByFriend: false,
  type: 'ECOLOGY',
  tags: ['plage'],
  history: [],
  popularity: 0.5,
  ...overrides,
});

describe('event score', () => {
  it('should have weights that sum to 1', () => {
    const sum = Object.values(EVENT_WEIGHTS).reduce((total, weight) => total + weight, 0);

    expect(sum).toBeCloseTo(1, 10);
  });

  describe('proximity', () => {
    it('should decrease with exp(-distance / 15 km)', () => {
      expect(proximityScore(0)).toBe(1);
      expect(proximityScore(15)).toBeCloseTo(Math.exp(-1), 10);
      expect(proximityScore(30)).toBeLessThan(proximityScore(15));
    });

    it('should be neutral when the position is unknown', () => {
      expect(proximityScore(null)).toBe(0.5);
    });

    it('should be 0 beyond the 100 km cut-off, which is not a candidate', () => {
      expect(proximityScore(100.1)).toBe(0);
      expect(isWithinRange(100)).toBe(true);
      expect(isWithinRange(100.1)).toBe(false);
      expect(isWithinRange(null)).toBe(true);
    });
  });

  describe('imminence', () => {
    it('should favour an event in 2 days over one in 2 months', () => {
      expect(imminenceScore(inDays(2), NOW)).toBeGreaterThan(imminenceScore(inDays(60), NOW));
      expect(imminenceScore(inDays(60), NOW)).toBe(0);
      expect(imminenceScore(inDays(30), NOW)).toBeCloseTo(0.5, 10);
    });

    it('should never exceed 1 for an event that is about to start', () => {
      expect(imminenceScore(NOW, NOW)).toBe(1);
      expect(imminenceScore(inDays(-1), NOW)).toBe(1);
    });
  });

  describe('type and tags affinity', () => {
    it('should be neutral for a new account without history', () => {
      expect(typeAffinityScore('ECOLOGY', ['plage'], [])).toBe(0.5);
    });

    it('should average the type share and the tag overlap', () => {
      const history = [
        { type: 'ECOLOGY' as const, tags: ['plage', 'dechets'] },
        { type: 'SOCIAL' as const, tags: ['repas'] },
      ];

      // type share 1/2, tags {plage} against {plage, dechets, repas}: 1/3
      expect(typeAffinityScore('ECOLOGY', ['plage'], history)).toBeCloseTo((0.5 + 1 / 3) / 2, 10);
    });

    it('should ignore the case and the blanks of the tags', () => {
      const history = [{ type: 'ECOLOGY' as const, tags: ['Plage '] }];

      expect(typeAffinityScore('ECOLOGY', [' plage'], history)).toBe(1);
    });

    it('should be the type share alone when nobody has tags', () => {
      const history = [{ type: 'SOCIAL' as const, tags: [] }];

      expect(typeAffinityScore('SOCIAL', [], history)).toBe(0.5);
    });
  });

  describe('structural score', () => {
    it('should give 1 to a perfect candidate and 0 to the worst one', () => {
      const best = eventScoreComponents(
        build({
          distanceKm: 0,
          startAt: NOW,
          touchedByFriend: true,
          popularity: 1,
          history: [{ type: 'ECOLOGY', tags: ['plage'] }],
        }),
      );
      const worst = eventScoreComponents(
        build({
          distanceKm: 200,
          startAt: inDays(90),
          history: [{ type: 'SOCIAL', tags: ['repas'] }],
          popularity: 0,
        }),
      );

      expect(structuralEventScore(best)).toBe(1);
      expect(structuralEventScore(worst)).toBe(0);
    });

    it('should count a friend as a boolean, not a number of friends', () => {
      const withFriend = structuralEventScore(eventScoreComponents(build({ touchedByFriend: true })));
      const withoutFriend = structuralEventScore(eventScoreComponents(build()));

      expect(withFriend - withoutFriend).toBeCloseTo(EVENT_WEIGHTS.friends, 4);
    });

    it('should be rounded to the four decimals of the column', () => {
      const score = structuralEventScore(eventScoreComponents(build({ distanceKm: 7.3 })));

      expect(Number(score.toFixed(4))).toBe(score);
    });

    it('should flag an unknown position as neutral', () => {
      expect(eventScoreComponents(build({ distanceKm: null })).proximityKnown).toBe(false);
      expect(eventScoreComponents(build()).proximityKnown).toBe(true);
    });
  });
});

describe('popularity', () => {
  it('should be neutral without any vote, any fill or any mention', () => {
    const popularity = computePopularity({
      wishes: 0,
      passes: 0,
      currentParticipants: 0,
      maxParticipants: 0,
      mentionAuthors: 0,
    });

    expect(popularity).toBeCloseTo(0.4 * 0.5, 10);
  });

  it('should not be extreme with two votes', () => {
    const twoWishes = computePopularity({
      wishes: 2,
      passes: 0,
      currentParticipants: 0,
      maxParticipants: 10,
      mentionAuthors: 0,
    });

    expect(twoWishes).toBeCloseTo(0.4 * (4 / 6), 10);
    expect(twoWishes).toBeLessThan(0.4);
  });

  it('should take the fill rate of the event, 0 without capacity', () => {
    const half = computePopularity({
      wishes: 0,
      passes: 0,
      currentParticipants: 5,
      maxParticipants: 10,
      mentionAuthors: 0,
    });
    const noCapacity = computePopularity({
      wishes: 0,
      passes: 0,
      currentParticipants: 5,
      maxParticipants: 0,
      mentionAuthors: 0,
    });

    expect(half - noCapacity).toBeCloseTo(0.3 * 0.5, 10);
  });

  it('should saturate at 10 distinct authors', () => {
    const base = { wishes: 0, passes: 0, currentParticipants: 0, maxParticipants: 0 };

    expect(computePopularity({ ...base, mentionAuthors: 10 })).toBeCloseTo(0.2 + 0.3, 10);
    expect(computePopularity({ ...base, mentionAuthors: 500 })).toBeCloseTo(0.2 + 0.3, 10);
  });

  it('should drop with the passes', () => {
    const base = { currentParticipants: 0, maxParticipants: 0, mentionAuthors: 0 };

    expect(computePopularity({ ...base, wishes: 0, passes: 20 })).toBeLessThan(
      computePopularity({ ...base, wishes: 0, passes: 0 }),
    );
  });
});
