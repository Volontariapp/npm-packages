import { BADGE_METRICS } from './constants.js';
import type { BadgeRule } from './interfaces.js';

const M = BADGE_METRICS;

/**
 * Source unique des seuils et des points des 13 badges (points x10, voir docs/badges/11).
 * Les slugs sont ceux du seed `SeedDefaultBadges` de ms-user.
 */
export const BADGE_CATALOG: readonly BadgeRule[] = [
  { slug: 'EVENT_PARTICIPATION_TIER_1', points: 100, requirements: [{ metric: M.EVENTS_FINISHED_TOTAL, target: 1 }] },
  { slug: 'EVENT_PARTICIPATION_TIER_2', points: 250, requirements: [{ metric: M.EVENTS_FINISHED_TOTAL, target: 5 }] },
  { slug: 'EVENT_PARTICIPATION_TIER_3', points: 500, requirements: [{ metric: M.EVENTS_FINISHED_TOTAL, target: 10 }] },
  { slug: 'EVENT_PARTICIPATION_TIER_4', points: 1000, requirements: [{ metric: M.EVENTS_FINISHED_TOTAL, target: 20 }] },
  { slug: 'EVENT_SOCIAL_TIER_1', points: 150, requirements: [{ metric: M.EVENTS_FINISHED_SOCIAL, target: 1 }] },
  { slug: 'EVENT_SOCIAL_TIER_2', points: 400, requirements: [{ metric: M.EVENTS_FINISHED_SOCIAL, target: 5 }] },
  { slug: 'EVENT_ECOLOGY_TIER_1', points: 150, requirements: [{ metric: M.EVENTS_FINISHED_ECOLOGY, target: 1 }] },
  { slug: 'EVENT_ECOLOGY_TIER_2', points: 400, requirements: [{ metric: M.EVENTS_FINISHED_ECOLOGY, target: 5 }] },
  {
    slug: 'EVENT_HYBRID_ECO_SOCIAL_TIER_1',
    points: 600,
    requirements: [
      { metric: M.EVENTS_FINISHED_SOCIAL, target: 5 },
      { metric: M.EVENTS_FINISHED_ECOLOGY, target: 5 },
    ],
  },
  { slug: 'EVENT_HOST_COUNT_1', points: 200, requirements: [{ metric: M.EVENTS_CREATED, target: 1 }] },
  { slug: 'COMMUNITY_POST_COUNT_1', points: 100, requirements: [{ metric: M.POSTS_CREATED, target: 1 }] },
  { slug: 'SOCIAL_LIKE_COUNT_10', points: 100, requirements: [{ metric: M.SOCIAL_LIKES_GIVEN, target: 10 }] },
  { slug: 'EVENT_WISHLIST_COUNT_10', points: 100, requirements: [{ metric: M.SOCIAL_WISHES, target: 10 }] },
];

const RULES_BY_SLUG: ReadonlyMap<string, BadgeRule> = new Map(
  BADGE_CATALOG.map((rule) => [rule.slug, rule]),
);

export function getBadgeRule(slug: string): BadgeRule | undefined {
  return RULES_BY_SLUG.get(slug);
}

/** Points d'un badge, 0 si le slug est inconnu du catalogue. */
export function getBadgePoints(slug: string): number {
  return RULES_BY_SLUG.get(slug)?.points ?? 0;
}
