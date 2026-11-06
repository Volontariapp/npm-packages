/** Version du barème de points des badges, stockée avec chaque crédit. */
export const BADGE_POINTS_VERSION = 1;

/** Compteurs de progression stockés dans `badge_progress` (clé `(user_id, metric)`). */
export const BADGE_METRICS = {
  EVENTS_FINISHED_TOTAL: 'EVENTS_FINISHED_TOTAL',
  EVENTS_FINISHED_SOCIAL: 'EVENTS_FINISHED_SOCIAL',
  EVENTS_FINISHED_ECOLOGY: 'EVENTS_FINISHED_ECOLOGY',
  EVENTS_CREATED: 'EVENTS_CREATED',
  POSTS_CREATED: 'POSTS_CREATED',
  SOCIAL_LIKES_GIVEN: 'SOCIAL_LIKES_GIVEN',
  SOCIAL_WISHES: 'SOCIAL_WISHES',
} as const;

export type BadgeMetric = (typeof BADGE_METRICS)[keyof typeof BADGE_METRICS];
