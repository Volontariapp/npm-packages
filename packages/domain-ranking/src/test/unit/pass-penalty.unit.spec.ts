import { describe, it, expect } from '@jest/globals';
import { applyPassPenalties } from '../../index.js';
import type { PoolItem } from '../../index.js';

const item = (rank: number, score: number, type: 'SOCIAL' | 'ECOLOGY', tags: string[] = []): PoolItem => ({
  id: `event-${String(rank)}`,
  rank,
  score,
  type,
  tags,
});

describe('PASS penalties', () => {
  const pool = [
    item(1, 0.9, 'ECOLOGY', ['plage']),
    item(2, 0.8, 'ECOLOGY', ['plage']),
    item(3, 0.78, 'SOCIAL', ['repas']),
    item(4, 0.7, 'ECOLOGY', ['foret']),
    item(5, 0.6, 'SOCIAL', ['repas']),
  ];
  const passedBeach = Array.from({ length: 6 }, () => ({ type: 'ECOLOGY' as const, tags: ['plage'] }));

  it('should leave the pool unchanged without any pass', () => {
    expect(applyPassPenalties(pool, 0, [])).toEqual(pool);
  });

  it('should demote the items that look like the passed events', () => {
    const result = applyPassPenalties(pool, 0, passedBeach);

    // adjusted scores: 3 -> 0.78, 1 -> 0.63, 4 -> 0.616, 5 -> 0.60, 2 -> 0.56
    expect(result.map((entry) => entry.id)).toEqual([
      'event-3',
      'event-1',
      'event-4',
      'event-5',
      'event-2',
    ]);
  });

  it('should never move the items already served', () => {
    const result = applyPassPenalties(pool, 1, passedBeach);

    expect(result[0]).toEqual(pool[0]);
  });

  it('should reorder only the unserved items and renumber them with no gap and no duplicate', () => {
    const result = applyPassPenalties(pool, 1, passedBeach);

    expect(result.map((entry) => [entry.id, entry.rank])).toEqual([
      ['event-1', 1],
      ['event-3', 2],
      ['event-4', 3],
      ['event-5', 4],
      ['event-2', 5],
    ]);
  });

  it('should leave the unserved items untouched when nothing resembles the passed events', () => {
    const result = applyPassPenalties(pool, 2, passedBeach);

    // items 3, 4, 5 keep their order: 0.78 > 0.616 > 0.60
    expect(result.map((entry) => entry.id)).toEqual(pool.map((entry) => entry.id));
  });

  it('should keep the original order among items with the same adjusted score', () => {
    const tied = [item(1, 0.5, 'SOCIAL'), item(2, 0.5, 'SOCIAL'), item(3, 0.5, 'SOCIAL')];

    expect(applyPassPenalties(tied, 0, []).map((entry) => entry.id)).toEqual([
      'event-1',
      'event-2',
      'event-3',
    ]);
  });

  it('should cap the penalty so that a high score still wins over a low one', () => {
    const many = Array.from({ length: 200 }, () => ({ type: 'ECOLOGY' as const, tags: ['plage'] }));
    const result = applyPassPenalties([item(1, 0.9, 'ECOLOGY', ['plage']), item(2, 0.3, 'SOCIAL')], 0, many);

    // 0.9 * (1 - 0.5) = 0.45 > 0.3
    expect(result[0]?.id).toBe('event-1');
  });

  it('should not mutate the input', () => {
    const before = JSON.stringify(pool);

    applyPassPenalties(pool, 0, passedBeach);

    expect(JSON.stringify(pool)).toBe(before);
  });
});
