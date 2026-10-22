/** Score of a post: the weights sum to 1. */
export const POST_WEIGHTS = {
  eventTie: 0.35,
  authorAffinity: 0.3,
  recency: 0.35,
} as const;
/** Event tie of a post whose event is past and was attended. */
export const EVENT_TIE_PAST_JOINED = 0.5;
/** Single factor applied to a post already liked or commented. */
export const ENGAGED_POST_DEMOTION = 0;
