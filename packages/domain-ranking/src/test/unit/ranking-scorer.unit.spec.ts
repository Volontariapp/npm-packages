import { describe, it, expect } from '@jest/globals';
import { NoopRankingScorer, RankingScorerUnavailableException } from '../../index.js';
import type { RankingScorer } from '../../index.js';

describe('NoopRankingScorer', () => {
  it('should evaluate nothing', async () => {
    const scorer: RankingScorer = new NoopRankingScorer();

    const scores = await scorer.score(
      { ecologyShare: 1, socialShare: 0, history: [] },
      [{ eventId: 'e-1', name: 'Plage', type: 'ECOLOGY', tags: [], summary: '' }],
    );

    expect(scores.size).toBe(0);
  });

  it('should expose an error type for the fallback', () => {
    const error = new RankingScorerUnavailableException();

    expect(error).toBeInstanceOf(Error);
    expect(error.code).toBe('RANKING_SCORER_UNAVAILABLE');
  });
});
