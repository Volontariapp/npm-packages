import { describe, it, expect } from '@jest/globals';
import {
  EventRankingReason,
  PostRankingReason,
  eventReasons,
  eventScoreComponents,
  postReasons,
  postScoreComponents,
} from '../../index.js';
import type { EventScoreInput, PostScoreInput } from '../../index.js';

const NOW = new Date('2026-10-19T10:00:00Z');

const event = (overrides: Partial<EventScoreInput> = {}): EventScoreInput => ({
  now: NOW,
  startAt: new Date(NOW.getTime() + 40 * 86_400_000),
  distanceKm: 80,
  touchedByFriend: false,
  type: 'ECOLOGY',
  tags: [],
  history: [{ type: 'SOCIAL', tags: [] }],
  popularity: 0.1,
  ...overrides,
});

const post = (overrides: Partial<PostScoreInput> = {}): PostScoreInput => ({
  ageHours: 200,
  eventTie: 'NONE',
  signals: [],
  followed: false,
  friend: false,
  alreadyEngaged: false,
  ...overrides,
});

describe('event reasons', () => {
  it('should be empty when nothing stands out', () => {
    expect(eventReasons(eventScoreComponents(event()))).toEqual([]);
  });

  it('should return at most two codes, the strongest first', () => {
    const reasons = eventReasons(
      eventScoreComponents(
        event({
          touchedByFriend: true,
          distanceKm: 1,
          startAt: new Date(NOW.getTime() + 86_400_000),
          popularity: 1,
        }),
      ),
    );

    // friends (0.23) and proximity (0.27 * 0.93) outweigh imminence and popularity
    expect(reasons).toHaveLength(2);
    expect(reasons).toEqual([EventRankingReason.NEAR_YOU, EventRankingReason.FRIEND_INVOLVED]);
  });

  it('should not claim NEAR_YOU when the position is unknown', () => {
    const reasons = eventReasons(eventScoreComponents(event({ distanceKm: null })));

    expect(reasons).not.toContain(EventRankingReason.NEAR_YOU);
  });

  it('should explain a trending event', () => {
    const reasons = eventReasons(eventScoreComponents(event({ popularity: 0.9 })));

    expect(reasons).toEqual([EventRankingReason.TRENDING]);
  });

  it('should explain an interest match', () => {
    const reasons = eventReasons(
      eventScoreComponents(
        event({ history: [{ type: 'ECOLOGY', tags: ['plage'] }], tags: ['plage'] }),
      ),
    );

    expect(reasons).toEqual([EventRankingReason.MATCHES_INTERESTS]);
  });
});

describe('post reasons', () => {
  const reasonsOf = (input: PostScoreInput): PostRankingReason[] =>
    postReasons({
      components: postScoreComponents(input),
      eventTie: input.eventTie,
      followed: input.followed,
      friend: input.friend,
    });

  it('should be empty for an old post of an unknown author', () => {
    expect(reasonsOf(post())).toEqual([]);
  });

  it('should put the linked event first when it is wished', () => {
    const reasons = reasonsOf(post({ eventTie: 'FUTURE_WISHED', followed: true }));

    expect(reasons[0]).toBe(PostRankingReason.LINKED_EVENT_WISHED);
    expect(reasons).toHaveLength(2);
  });

  it('should say joined for a joined event, past or future', () => {
    expect(reasonsOf(post({ eventTie: 'PAST_JOINED' }))).toContain(
      PostRankingReason.LINKED_EVENT_JOINED,
    );
    expect(reasonsOf(post({ eventTie: 'FUTURE_JOINED' }))).toContain(
      PostRankingReason.LINKED_EVENT_JOINED,
    );
  });

  it('should say RECENT for a fresh post and FOLLOWED_AUTHOR for a followed author', () => {
    expect(reasonsOf(post({ ageHours: 1 }))).toEqual([PostRankingReason.RECENT]);
    expect(reasonsOf(post({ followed: true }))).toEqual([PostRankingReason.FOLLOWED_AUTHOR]);
  });

  it('should say ENGAGED_AUTHOR after recent interactions', () => {
    const reasons = reasonsOf(post({ signals: [{ kind: 'COMMENT', ageDays: 1 }] }));

    expect(reasons).toEqual([PostRankingReason.ENGAGED_AUTHOR]);
  });
});
