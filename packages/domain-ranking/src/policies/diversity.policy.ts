import { DIVERSITY_WINDOW } from '../constants/index.js';

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
