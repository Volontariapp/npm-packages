/** Popularity: smoothed interest, fill rate and distinct authors of linked posts. */
export const POPULARITY_PRIOR_WISHES = 2;
export const POPULARITY_PRIOR_PASSES = 2;
export const POPULARITY_MENTION_SATURATION = 10;
export const POPULARITY_WEIGHTS = { interest: 0.4, fill: 0.3, mentions: 0.3 } as const;
/** Window of the linked posts counted by the popularity, in days. */
export const POPULARITY_BUZZ_WINDOW_DAYS = 14;
