/** Post author affinity: min(1, sum(weight * decay(age)) / SATURATION) plus the relation bonus. */
export const AUTHOR_SIGNAL_WEIGHTS = { LIKE: 1, COMMENT: 2 } as const;
export const AUTHOR_SIGNAL_HALF_LIFE_DAYS = 14;
export const AUTHOR_SIGNAL_SATURATION = 6;
export const AUTHOR_FOLLOW_BONUS = 0.25;
export const AUTHOR_FRIEND_BONUS = 0.15;
