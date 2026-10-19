import { DIVERSITY_WINDOW } from '../constants/index.js';
import { roundScore } from './math.js';

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

/**
 * Greedy diversity pass on a sorted list: a post is postponed when the DIVERSITY_WINDOW posts
 * kept just before it have the same author. When only one author remains, nothing is dropped.
 */
export const diversifyByAuthor = <T extends { authorId: string }>(sorted: readonly T[]): T[] => {
  const pending = [...sorted];
  const kept: T[] = [];
  while (pending.length > 0) {
    const recent = kept.slice(-DIVERSITY_WINDOW);
    const blocked = (item: T): boolean =>
      recent.length === DIVERSITY_WINDOW && recent.every((other) => other.authorId === item.authorId);
    const index = pending.findIndex((item) => !blocked(item));
    const next = pending.splice(index === -1 ? 0 : index, 1).at(0);
    if (next) kept.push(next);
  }
  return kept;
};
