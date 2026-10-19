import {
  AUTHOR_FOLLOW_BONUS,
  AUTHOR_FRIEND_BONUS,
  AUTHOR_SIGNAL_HALF_LIFE_DAYS,
  AUTHOR_SIGNAL_SATURATION,
  AUTHOR_SIGNAL_WEIGHTS,
  ENGAGED_POST_DEMOTION,
  EVENT_TIE_PAST_JOINED,
  POST_RECENCY_SCALE_HOURS,
  POST_WEIGHTS,
} from '../constants/index.js';
import { clamp, roundScore } from './math.js';

/** Relation between a post and an event of the user. */
export type EventTieState = 'NONE' | 'FUTURE_WISHED' | 'FUTURE_JOINED' | 'PAST_JOINED';

/** A like or a comment of the user on a post of the author. */
export interface AuthorSignal {
  kind: keyof typeof AUTHOR_SIGNAL_WEIGHTS;
  ageDays: number;
}

export interface PostScoreInput {
  ageHours: number;
  eventTie: EventTieState;
  /** Likes and comments of the user on the posts of this author (never on the user's own posts). */
  signals: readonly AuthorSignal[];
  followed: boolean;
  friend: boolean;
  /** The user already liked or commented this very post. */
  alreadyEngaged: boolean;
}

export interface PostScoreComponents {
  eventTie: number;
  /** Interaction part of the author affinity, before the follow and friend bonus. */
  authorSignal: number;
  authorAffinity: number;
  recency: number;
}

/** 1 for a future event wished or joined, 0.5 for a past event that was joined, 0 otherwise. */
export const eventTieScore = (state: EventTieState): number => {
  switch (state) {
    case 'FUTURE_WISHED':
    case 'FUTURE_JOINED':
      return 1;
    case 'PAST_JOINED':
      return EVENT_TIE_PAST_JOINED;
    case 'NONE':
      return 0;
  }
};

const decay = (ageDays: number): number =>
  Math.pow(0.5, Math.max(0, ageDays) / AUTHOR_SIGNAL_HALF_LIFE_DAYS);

/** min(1, sum(weight * decay(age)) / K): K = 6 keeps one like and one comment from saturating. */
export const authorSignalScore = (signals: readonly AuthorSignal[]): number =>
  Math.min(
    1,
    signals.reduce((sum, signal) => sum + AUTHOR_SIGNAL_WEIGHTS[signal.kind] * decay(signal.ageDays), 0) /
      AUTHOR_SIGNAL_SATURATION,
  );

export const authorAffinityScore = (
  signal: number,
  followed: boolean,
  friend: boolean,
): number =>
  Math.min(
    1,
    signal + (followed ? AUTHOR_FOLLOW_BONUS : 0) + (friend ? AUTHOR_FRIEND_BONUS : 0),
  );

/** exp(-age / 48 h): half-life of about 33 hours. */
export const recencyScore = (ageHours: number): number =>
  Math.exp(-Math.max(0, ageHours) / POST_RECENCY_SCALE_HOURS);

export const postScoreComponents = (input: PostScoreInput): PostScoreComponents => {
  const authorSignal = authorSignalScore(input.signals);
  return {
    eventTie: eventTieScore(input.eventTie),
    authorSignal,
    authorAffinity: authorAffinityScore(authorSignal, input.followed, input.friend),
    recency: recencyScore(input.ageHours),
  };
};

/**
 * Structural score of a post. A post already liked or commented is demoted by a single factor
 * (no cumulation when it is both), never excluded.
 */
export const structuralPostScore = (
  components: PostScoreComponents,
  alreadyEngaged: boolean,
): number => {
  const raw =
    POST_WEIGHTS.eventTie * components.eventTie +
    POST_WEIGHTS.authorAffinity * components.authorAffinity +
    POST_WEIGHTS.recency * components.recency;
  return roundScore(alreadyEngaged ? raw * ENGAGED_POST_DEMOTION : clamp(raw));
};
