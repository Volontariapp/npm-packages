import { describe, it, expect } from '@jest/globals';
import {
  EVENT_SEMANTIC_WEIGHT,
  POST_SEMANTIC_WEIGHT,
  assignRanks,
  blendScores,
  capUnevaluated,
  diversifyByAuthor,
} from '../../index.js';

describe('final score', () => {
  it('should keep the structural score without a semantic score', () => {
    expect(blendScores(0.6, undefined, EVENT_SEMANTIC_WEIGHT)).toBe(0.6);
  });

  it('should blend 50/50 for the events and 85/15 for the posts', () => {
    expect(blendScores(0.6, 0.2, EVENT_SEMANTIC_WEIGHT)).toBeCloseTo(0.4, 4);
    expect(blendScores(0.6, 0.2, POST_SEMANTIC_WEIGHT)).toBeCloseTo(0.85 * 0.6 + 0.15 * 0.2, 4);
  });

  it('should stay between 0 and 1', () => {
    expect(blendScores(1.4, 1.2, 0.5)).toBe(1);
    expect(blendScores(-1, undefined, 0.5)).toBe(0);
  });

  describe('capUnevaluated', () => {
    it('should keep an unevaluated candidate under the lowest evaluated one', () => {
      const capped = capUnevaluated([
        { id: 'a', score: 0.9, evaluated: false },
        { id: 'b', score: 0.5, evaluated: true },
        { id: 'c', score: 0.7, evaluated: true },
        { id: 'd', score: 0.3, evaluated: false },
      ]);

      expect(capped.map((item) => [item.id, item.score])).toEqual([
        ['a', 0.5],
        ['b', 0.5],
        ['c', 0.7],
        ['d', 0.3],
      ]);
    });

    it('should change nothing when no candidate was evaluated', () => {
      const candidates = [
        { id: 'a', score: 0.9, evaluated: false },
        { id: 'b', score: 0.1, evaluated: false },
      ];

      expect(capUnevaluated(candidates)).toEqual(candidates);
    });
  });

  describe('assignRanks', () => {
    it('should sort by score, break ties by id and number from 1', () => {
      const ranked = assignRanks(
        [
          { id: 'b', score: 0.5 },
          { id: 'c', score: 0.9 },
          { id: 'a', score: 0.5 },
        ],
        10,
      );

      expect(ranked.map((item) => [item.id, item.rank])).toEqual([
        ['c', 1],
        ['a', 2],
        ['b', 3],
      ]);
    });

    it('should keep the list size at most', () => {
      const candidates = Array.from({ length: 150 }, (_, index) => ({
        id: `id-${String(index).padStart(3, '0')}`,
        score: 1 - index / 1000,
      }));

      expect(assignRanks(candidates, 100)).toHaveLength(100);
    });
  });

  describe('diversifyByAuthor', () => {
    const post = (id: string, authorId: string) => ({ id, authorId });

    it('should postpone a post when the three previous ones have the same author', () => {
      const result = diversifyByAuthor([
        post('1', 'a'),
        post('2', 'a'),
        post('3', 'a'),
        post('4', 'a'),
        post('5', 'b'),
      ]);

      expect(result.map((item) => item.id)).toEqual(['1', '2', '3', '5', '4']);
    });

    it('should not drop anything when a single author remains', () => {
      const result = diversifyByAuthor([post('1', 'a'), post('2', 'a'), post('3', 'a'), post('4', 'a')]);

      expect(result.map((item) => item.id)).toEqual(['1', '2', '3', '4']);
    });

    it('should keep every post', () => {
      const input = Array.from({ length: 12 }, (_, index) => post(String(index), index < 9 ? 'a' : 'b'));

      expect(diversifyByAuthor(input)).toHaveLength(12);
    });
  });
});
