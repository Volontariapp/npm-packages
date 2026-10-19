import type { EventType } from '../enums/index.js';

/** One event as described to the semantic scorer: public text only, never a user identifier. */
export interface RankingCandidate {
  eventId: string;
  name: string;
  type: EventType;
  tags: readonly string[];
  /** First 200 characters of the description, without line breaks. */
  summary: string;
}

/** Deterministic summary of the taste of a user, built from the events they joined or wished. */
export interface TasteSummary {
  ecologyShare: number;
  socialShare: number;
  history: readonly RankingCandidate[];
}

/** The scorer is not reachable or refused the request: the caller falls back to the structural score. */
export class RankingScorerUnavailableError extends Error {
  constructor(message = 'Ranking scorer unavailable') {
    super(message);
    this.name = 'RankingScorerUnavailableError';
  }
}

/** Port of the semantic scorer (Jev). The domain does not know its transport. */
export interface RankingScorer {
  /** Probability (0 to 1) per eventId. A candidate absent from the map was not evaluated. */
  score(
    taste: TasteSummary,
    candidates: readonly RankingCandidate[],
  ): Promise<ReadonlyMap<string, number>>;
}

/** Evaluates nothing: every list is structural only. For tests, local runs without a key and T1. */
export class NoopRankingScorer implements RankingScorer {
  score(): Promise<ReadonlyMap<string, number>> {
    return Promise.resolve(new Map<string, number>());
  }
}
