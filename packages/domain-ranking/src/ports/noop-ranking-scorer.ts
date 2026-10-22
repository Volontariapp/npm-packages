import type { RankingScorer } from './ranking-scorer.port.js';

/** Evaluates nothing: every list is structural only. For tests, local runs without a key and T1. */
export class NoopRankingScorer implements RankingScorer {
  score(): Promise<ReadonlyMap<string, number>> {
    return Promise.resolve(new Map<string, number>());
  }
}
