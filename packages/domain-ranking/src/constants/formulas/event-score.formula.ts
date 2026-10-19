/** Structural score of an event: the weights sum to 1. */
export const EVENT_WEIGHTS = {
  proximity: 0.27,
  friends: 0.23,
  typeAffinity: 0.22,
  imminence: 0.18,
  popularity: 0.1,
} as const;
