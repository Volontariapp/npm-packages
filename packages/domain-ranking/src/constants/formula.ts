/**
 * Scoring constants. They are versioned: any change of a weight or a threshold below must
 * increment FORMULA_VERSION (events) or FEED_FORMULA_VERSION (posts), so that the lists computed
 * with another version are read as stale (docs/matching/05 section 2, 11 section 5, 13 section 2).
 */
export const FORMULA_VERSION = 1;
export const FEED_FORMULA_VERSION = 1;

/** Structural score of an event: the weights sum to 1. */
export const EVENT_WEIGHTS = {
  proximity: 0.27,
  friends: 0.23,
  typeAffinity: 0.22,
  imminence: 0.18,
  popularity: 0.1,
} as const;

/** Score of a post: the weights sum to 1. */
export const POST_WEIGHTS = {
  eventTie: 0.35,
  authorAffinity: 0.3,
  recency: 0.35,
} as const;

export const PROXIMITY_DECAY_KM = 15;
/** Events farther than this are not candidates. */
export const MAX_DISTANCE_KM = 100;
export const IMMINENCE_HORIZON_DAYS = 60;
/** Neutral values used when a signal is unknown. */
export const NEUTRAL_TYPE_AFFINITY = 0.5;
export const NEUTRAL_PROXIMITY = 0.5;

/** Popularity: smoothed interest, fill rate and distinct authors of linked posts. */
export const POPULARITY_PRIOR_WISHES = 2;
export const POPULARITY_PRIOR_PASSES = 2;
export const POPULARITY_MENTION_SATURATION = 10;
export const POPULARITY_WEIGHTS = { interest: 0.4, fill: 0.3, mentions: 0.3 } as const;
/** Window of the linked posts counted by the popularity, in days. */
export const POPULARITY_BUZZ_WINDOW_DAYS = 14;

/** Post author affinity. */
export const AUTHOR_SIGNAL_WEIGHTS = { LIKE: 1, COMMENT: 2 } as const;
export const AUTHOR_SIGNAL_HALF_LIFE_DAYS = 14;
export const AUTHOR_SIGNAL_SATURATION = 6;
export const AUTHOR_FOLLOW_BONUS = 0.25;
export const AUTHOR_FRIEND_BONUS = 0.15;
/** Post recency: exp(-ageInHours / this). Half-life of about 33 hours. */
export const POST_RECENCY_SCALE_HOURS = 48;
/** Event tie of a post whose event is past and was attended. */
export const EVENT_TIE_PAST_JOINED = 0.5;
/** Single factor applied to a post already liked or commented. */
export const ENGAGED_POST_DEMOTION = 0.6;
/** A post is postponed when the previous posts kept have the same author. */
export const DIVERSITY_WINDOW = 3;

/** Blend with the semantic score (Jev), when it is available for a candidate. */
export const EVENT_SEMANTIC_WEIGHT = 0.5;
export const POST_SEMANTIC_WEIGHT = 0.15;

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

/** Defaults of the settings owned by the services. */
export const DEFAULT_LIST_SIZE = 100;
export const DEFAULT_PASS_COOLDOWN_DAYS = 30;
export const DEFAULT_REQUEST_TTL_SECONDS = 120;
export const DEFAULT_LOCATION_REFRESH_KM = 10;
export const MAX_FEEDBACK_ITEMS = 50;

/** Rate buckets (tokens per window). */
export const REFRESH_BUCKET_CAPACITY = 5;
export const LOCATION_BUCKET_CAPACITY = 1;
export const BUCKET_WINDOW_SECONDS = 60;

/** Retention. */
export const LIKE_LOG_RETENTION_DAYS = 90;
export const LIKE_TOMBSTONE_RETENTION_DAYS = 7;
export const FEEDBACK_RETENTION_DAYS = 90;

/** PASS penalties applied at read time to the items not served yet. */
export const PASS_TYPE_PENALTY = 0.02;
export const PASS_TAG_PENALTY = 0.03;
export const PASS_MAX_PENALTY = 0.5;

/** Page size of the reads. */
export const DEFAULT_PAGE_LIMIT = 20;
export const MAX_PAGE_LIMIT = 50;
