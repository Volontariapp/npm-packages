export const clamp = (value: number, min = 0, max = 1): number =>
  Math.min(max, Math.max(min, value));

/** Scores are stored as numeric(5,4): four decimals. */
export const roundScore = (value: number): number => Math.round(clamp(value) * 10_000) / 10_000;

export const jaccard = (left: ReadonlySet<string>, right: ReadonlySet<string>): number => {
  if (left.size === 0 && right.size === 0) return 0;
  let shared = 0;
  for (const item of left) {
    if (right.has(item)) shared += 1;
  }
  return shared / (left.size + right.size - shared);
};

export const normalizeTags = (tags: readonly string[]): Set<string> =>
  new Set(tags.map((tag) => tag.trim().toLowerCase()).filter((tag) => tag.length > 0));
