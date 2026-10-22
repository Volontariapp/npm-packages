import { roundScore } from '../helpers/math.helpers.js';

/** Final score: a weighted blend when the semantic score exists, the structural score otherwise. */
export const blendScores = (
  structural: number,
  semantic: number | undefined,
  semanticWeight: number,
): number =>
  semantic === undefined
    ? roundScore(structural)
    : roundScore((1 - semanticWeight) * structural + semanticWeight * semantic);

export interface ScoredCandidate {
  id: string;
  score: number;
  /** true when the semantic scorer evaluated this candidate. */
  evaluated: boolean;
}

/**
 * A candidate the semantic scorer did not evaluate never goes ahead of one it evaluated: its
 * score is capped by the lowest score among the evaluated ones. Without any evaluated
 * candidate (structural-only list), nothing changes.
 */
export const capUnevaluated = <T extends ScoredCandidate>(candidates: readonly T[]): T[] => {
  const evaluated = candidates.filter((candidate) => candidate.evaluated);
  if (evaluated.length === 0) return [...candidates];
  const floor = Math.min(...evaluated.map((candidate) => candidate.score));
  return candidates.map((candidate) =>
    candidate.evaluated ? candidate : { ...candidate, score: Math.min(candidate.score, floor) },
  );
};

export interface RankedCandidate {
  id: string;
  score: number;
  rank: number;
}

/** Sorts by score then by id (deterministic) and numbers from 1. */
export const assignRanks = <T extends { id: string; score: number }>(
  candidates: readonly T[],
  limit: number,
): Array<T & { rank: number }> =>
  [...candidates]
    .sort((left, right) => right.score - left.score || left.id.localeCompare(right.id))
    .slice(0, limit)
    .map((candidate, index) => ({ ...candidate, rank: index + 1 }));
