import {
  EVENT_WEIGHTS,
  IMMINENCE_HORIZON_DAYS,
  MAX_DISTANCE_KM,
  NEUTRAL_PROXIMITY,
  NEUTRAL_TYPE_AFFINITY,
  PROXIMITY_DECAY_KM,
} from '../constants/index.js';
import type { EventType } from '../enums/index.js';
import { clamp, jaccard, normalizeTags, roundScore } from './math.js';

const MS_PER_DAY = 86_400_000;

export interface EventHistoryItem {
  type: EventType;
  tags: readonly string[];
}

export interface EventScoreInput {
  now: Date;
  startAt: Date;
  /** Distance to the user, in km. null when neither the position nor an origin is known. */
  distanceKm: number | null;
  /** The event is touched (joined, wished or created) by at least one friend. */
  touchedByFriend: boolean;
  type: EventType;
  tags: readonly string[];
  /** Events joined or wished by the user. Empty for a new account. */
  history: readonly EventHistoryItem[];
  /** Global popularity, between 0 and 1. */
  popularity: number;
}

export interface EventScoreComponents {
  proximity: number;
  friends: number;
  typeAffinity: number;
  imminence: number;
  popularity: number;
  /** false when the proximity is the neutral value of an unknown position. */
  proximityKnown: boolean;
}

/** exp(-distance / 15 km). Unknown position: neutral. Beyond the cut-off: 0. */
export const proximityScore = (distanceKm: number | null): number => {
  if (distanceKm === null) return NEUTRAL_PROXIMITY;
  if (distanceKm > MAX_DISTANCE_KM) return 0;
  return Math.exp(-Math.max(0, distanceKm) / PROXIMITY_DECAY_KM);
};

export const isWithinRange = (distanceKm: number | null): boolean =>
  distanceKm === null || distanceKm <= MAX_DISTANCE_KM;

/** 1 - clamp(daysBeforeStart / 60): an event in 2 days is worth more than one in 2 months. */
export const imminenceScore = (startAt: Date, now: Date): number => {
  const days = Math.max(0, (startAt.getTime() - now.getTime()) / MS_PER_DAY);
  return 1 - clamp(days / IMMINENCE_HORIZON_DAYS);
};

/** Mean of the type share in the history and of the tag overlap (Jaccard). Neutral without history. */
export const typeAffinityScore = (
  type: EventType,
  tags: readonly string[],
  history: readonly EventHistoryItem[],
): number => {
  if (history.length === 0) return NEUTRAL_TYPE_AFFINITY;
  const typeShare = history.filter((item) => item.type === type).length / history.length;
  const historyTags = normalizeTags(history.flatMap((item) => [...item.tags]));
  return (typeShare + jaccard(normalizeTags(tags), historyTags)) / 2;
};

export const eventScoreComponents = (input: EventScoreInput): EventScoreComponents => ({
  proximity: proximityScore(input.distanceKm),
  friends: input.touchedByFriend ? 1 : 0,
  typeAffinity: typeAffinityScore(input.type, input.tags, input.history),
  imminence: imminenceScore(input.startAt, input.now),
  popularity: clamp(input.popularity),
  proximityKnown: input.distanceKm !== null,
});

/** Structural score of an event, between 0 and 1, rounded to the four decimals of the column. */
export const structuralEventScore = (components: EventScoreComponents): number =>
  roundScore(
    EVENT_WEIGHTS.proximity * components.proximity +
      EVENT_WEIGHTS.friends * components.friends +
      EVENT_WEIGHTS.typeAffinity * components.typeAffinity +
      EVENT_WEIGHTS.imminence * components.imminence +
      EVENT_WEIGHTS.popularity * components.popularity,
  );
