import { DEFAULT_PAGE_LIMIT, MAX_PAGE_LIMIT } from '../constants/index.js';

/** Position in a list: the version of the list and the last rank served. */
export interface RankingCursor {
  listVersion: string;
  lastRank: number;
}

interface CursorPayload {
  v: 1;
  l: string;
  r: number;
}

/** Opaque to the clients: base64url of a small JSON document. */
export const encodeCursor = (cursor: RankingCursor): string =>
  Buffer.from(
    JSON.stringify({ v: 1, l: cursor.listVersion, r: cursor.lastRank } satisfies CursorPayload),
    'utf8',
  ).toString('base64url');

const isPayload = (value: unknown): value is CursorPayload =>
  typeof value === 'object' &&
  value !== null &&
  'v' in value &&
  value.v === 1 &&
  'l' in value &&
  typeof value.l === 'string' &&
  'r' in value &&
  typeof value.r === 'number' &&
  Number.isInteger(value.r) &&
  value.r >= 0;

/** null when the cursor is empty, malformed or from another cursor version. */
export const decodeCursor = (raw: string | undefined): RankingCursor | null => {
  if (!raw) return null;
  try {
    const parsed: unknown = JSON.parse(Buffer.from(raw, 'base64url').toString('utf8'));
    return isPayload(parsed) ? { listVersion: parsed.l, lastRank: parsed.r } : null;
  } catch {
    return null;
  }
};

export interface ResolvedCursor {
  /** Rank after which the page starts. */
  lastRank: number;
  /**
   * The list was recomputed since the cursor was issued, or the cursor is unreadable: the page
   * restarts at rank 1 and the client must start over.
   */
  versionChanged: boolean;
}

export const resolveCursor = (raw: string | undefined, currentVersion: string): ResolvedCursor => {
  if (!raw) return { lastRank: 0, versionChanged: false };
  const cursor = decodeCursor(raw);
  if (cursor?.listVersion !== currentVersion) return { lastRank: 0, versionChanged: true };
  return { lastRank: cursor.lastRank, versionChanged: false };
};

/** Page size: the default when absent or invalid, never above the maximum. */
export const normalizeLimit = (limit: number | undefined): number =>
  limit !== undefined && Number.isInteger(limit) && limit > 0
    ? Math.min(limit, MAX_PAGE_LIMIT)
    : DEFAULT_PAGE_LIMIT;

export interface RankedRow {
  rank: number;
}

export interface Page<T extends RankedRow> {
  items: T[];
  hasMore: boolean;
  /** Empty when hasMore is false. */
  nextCursor: string;
}

/**
 * Builds a page from the rows read after the cursor (limit + 1 of them, ordered by rank).
 * hasMore is based on the rank that follows, not on the length of the page.
 */
export const buildPage = <T extends RankedRow>(
  rows: readonly T[],
  limit: number,
  listVersion: string,
): Page<T> => {
  const items = rows.slice(0, limit);
  const hasMore = rows.length > limit;
  const last = items.at(-1);
  return {
    items,
    hasMore,
    nextCursor: hasMore && last ? encodeCursor({ listVersion, lastRank: last.rank }) : '',
  };
};
