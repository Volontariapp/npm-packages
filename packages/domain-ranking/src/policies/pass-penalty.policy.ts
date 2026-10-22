import { PASS_MAX_PENALTY, PASS_TAG_PENALTY, PASS_TYPE_PENALTY } from '../constants/index.js';
import type { EventType } from '../enums/index.js';
import { normalizeTags } from '../helpers/math.helpers.js';

export interface PoolItem {
  id: string;
  rank: number;
  score: number;
  type: EventType;
  tags: readonly string[];
}

export interface PassedEvent {
  type: EventType;
  tags: readonly string[];
}

const penaltyOf = (item: PoolItem, passed: readonly PassedEvent[]): number => {
  const itemTags = normalizeTags(item.tags);
  let sameType = 0;
  let sharedTags = 0;
  for (const event of passed) {
    if (event.type === item.type) sameType += 1;
    for (const tag of normalizeTags(event.tags)) {
      if (itemTags.has(tag)) sharedTags += 1;
    }
  }
  return Math.min(PASS_MAX_PENALTY, PASS_TYPE_PENALTY * sameType + PASS_TAG_PENALTY * sharedTags);
};

/**
 * Reorders the items not served yet (rank > lastRank) by lowering the score of those that
 * resemble recently passed events. The items already served (rank <= lastRank) never move.
 *
 * The unserved items are renumbered from lastRank + 1 with no gap: the caller persists the new
 * ranks, so that a cursor (listVersion, lastRank) still names exactly the items already
 * served. No item is served twice and none is skipped.
 */
export const applyPassPenalties = (
  pool: readonly PoolItem[],
  lastRank: number,
  passed: readonly PassedEvent[],
): PoolItem[] => {
  const served = pool.filter((item) => item.rank <= lastRank).sort((a, b) => a.rank - b.rank);
  const unserved = pool
    .filter((item) => item.rank > lastRank)
    .map((item) => ({ item, adjusted: item.score * (1 - penaltyOf(item, passed)) }))
    .sort((a, b) => b.adjusted - a.adjusted || a.item.rank - b.item.rank)
    .map(({ item }, index) => ({ ...item, rank: lastRank + 1 + index }));
  return [...served, ...unserved];
};
