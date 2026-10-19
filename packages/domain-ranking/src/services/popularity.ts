import {
  POPULARITY_MENTION_SATURATION,
  POPULARITY_PRIOR_PASSES,
  POPULARITY_PRIOR_WISHES,
  POPULARITY_WEIGHTS,
} from '../constants/index.js';
import { clamp } from './math.js';

export interface PopularityInput {
  /** Active wishes (table ranking_event_wish). */
  wishes: number;
  /** PASS swipes (table ranking_event_feedback). */
  passes: number;
  currentParticipants: number;
  /** 0 or less means no capacity is known. */
  maxParticipants: number;
  /** Distinct authors of the posts linked to the event over the buzz window. */
  mentionAuthors: number;
}

/** Smoothed interest: 0.5 without any vote, never extreme with two votes. */
export const interestScore = (wishes: number, passes: number): number =>
  (wishes + POPULARITY_PRIOR_WISHES) /
  (wishes + passes + POPULARITY_PRIOR_WISHES + POPULARITY_PRIOR_PASSES);

export const fillScore = (currentParticipants: number, maxParticipants: number): number =>
  maxParticipants > 0 ? clamp(currentParticipants / maxParticipants) : 0;

/** Logarithmic: past the saturation, one more author adds almost nothing. */
export const mentionScore = (distinctAuthors: number): number =>
  Math.min(
    1,
    Math.log(1 + Math.max(0, distinctAuthors)) / Math.log(1 + POPULARITY_MENTION_SATURATION),
  );

/** Global popularity of an event, between 0 and 1, identical for every user. */
export const computePopularity = (input: PopularityInput): number =>
  clamp(
    POPULARITY_WEIGHTS.interest * interestScore(input.wishes, input.passes) +
      POPULARITY_WEIGHTS.fill * fillScore(input.currentParticipants, input.maxParticipants) +
      POPULARITY_WEIGHTS.mentions * mentionScore(input.mentionAuthors),
  );
