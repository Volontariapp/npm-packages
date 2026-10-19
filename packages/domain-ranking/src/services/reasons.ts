import {
  AUTHOR_FOLLOW_BONUS,
  AUTHOR_FRIEND_BONUS,
  EVENT_WEIGHTS,
  MAX_REASONS,
  POST_WEIGHTS,
  REASON_THRESHOLDS,
} from '../constants/index.js';
import { EventRankingReason, PostRankingReason } from '../enums/index.js';
import type { EventScoreComponents } from './event-score.js';
import type { EventTieState, PostScoreComponents } from './post-score.js';

interface ReasonCandidate<TReason extends string> {
  reason: TReason;
  qualifies: boolean;
  /** Weighted contribution to the score: the strongest explanations win. */
  contribution: number;
}

/** At most MAX_REASONS codes, strongest first; the order of the list breaks the ties. */
const pickReasons = <TReason extends string>(
  candidates: readonly ReasonCandidate<TReason>[],
): TReason[] =>
  candidates
    .map((candidate, index) => ({ candidate, index }))
    .filter(({ candidate }) => candidate.qualifies)
    .sort(
      (left, right) =>
        right.candidate.contribution - left.candidate.contribution || left.index - right.index,
    )
    .slice(0, MAX_REASONS)
    .map(({ candidate }) => candidate.reason);

/** Explanation codes of an event: the components that weigh most and reach their threshold. */
export const eventReasons = (components: EventScoreComponents): EventRankingReason[] =>
  pickReasons<EventRankingReason>([
    {
      reason: EventRankingReason.FRIEND_INVOLVED,
      qualifies: components.friends === 1,
      contribution: EVENT_WEIGHTS.friends * components.friends,
    },
    {
      // A neutral proximity (unknown position) never explains anything.
      reason: EventRankingReason.NEAR_YOU,
      qualifies: components.proximityKnown && components.proximity >= REASON_THRESHOLDS.nearYou,
      contribution: EVENT_WEIGHTS.proximity * components.proximity,
    },
    {
      reason: EventRankingReason.MATCHES_INTERESTS,
      qualifies: components.typeAffinity >= REASON_THRESHOLDS.matchesInterests,
      contribution: EVENT_WEIGHTS.typeAffinity * components.typeAffinity,
    },
    {
      reason: EventRankingReason.STARTING_SOON,
      qualifies: components.imminence >= REASON_THRESHOLDS.startingSoon,
      contribution: EVENT_WEIGHTS.imminence * components.imminence,
    },
    {
      reason: EventRankingReason.TRENDING,
      qualifies: components.popularity >= REASON_THRESHOLDS.trending,
      contribution: EVENT_WEIGHTS.popularity * components.popularity,
    },
  ]);

export interface PostReasonInput {
  components: PostScoreComponents;
  eventTie: EventTieState;
  followed: boolean;
  friend: boolean;
}

/** Explanation codes of a post. */
export const postReasons = (input: PostReasonInput): PostRankingReason[] =>
  pickReasons<PostRankingReason>([
    {
      reason: PostRankingReason.LINKED_EVENT_WISHED,
      qualifies: input.eventTie === 'FUTURE_WISHED',
      contribution: POST_WEIGHTS.eventTie * input.components.eventTie,
    },
    {
      reason: PostRankingReason.LINKED_EVENT_JOINED,
      qualifies: input.eventTie === 'FUTURE_JOINED' || input.eventTie === 'PAST_JOINED',
      contribution: POST_WEIGHTS.eventTie * input.components.eventTie,
    },
    {
      reason: PostRankingReason.FOLLOWED_AUTHOR,
      qualifies: input.followed,
      contribution: POST_WEIGHTS.authorAffinity * AUTHOR_FOLLOW_BONUS,
    },
    {
      reason: PostRankingReason.FRIEND_AUTHOR,
      qualifies: input.friend,
      contribution: POST_WEIGHTS.authorAffinity * AUTHOR_FRIEND_BONUS,
    },
    {
      reason: PostRankingReason.ENGAGED_AUTHOR,
      qualifies: input.components.authorSignal >= REASON_THRESHOLDS.engagedAuthor,
      contribution: POST_WEIGHTS.authorAffinity * input.components.authorSignal,
    },
    {
      reason: PostRankingReason.RECENT,
      qualifies: input.components.recency >= REASON_THRESHOLDS.recent,
      contribution: POST_WEIGHTS.recency * input.components.recency,
    },
  ]);
