/** Explanation codes: a component must reach its threshold to explain a ranked item. */
export const MAX_REASONS = 2;
export const REASON_THRESHOLDS = {
  nearYou: 0.5,
  matchesInterests: 0.6,
  startingSoon: 0.8,
  trending: 0.65,
  engagedAuthor: 0.1,
  recent: 0.6,
} as const;
