import { BADGE_CATALOG } from './badge-catalog.js';
import type {
  BadgeProgressResult,
  BadgeRequirementProgress,
  ComputeBadgeProgressParams,
} from './interfaces.js';

/**
 * Progression de l'utilisateur vers chaque badge du catalogue.
 * `unlocked` vient uniquement de `awarded` (un badge est un acquis) : les compteurs, parfois en retard,
 * ne peuvent ni débloquer ni reverrouiller un badge.
 */
export function computeBadgeProgress(params: ComputeBadgeProgressParams): BadgeProgressResult[] {
  return BADGE_CATALOG.map((rule): BadgeProgressResult => {
    const requirements: BadgeRequirementProgress[] = rule.requirements.map((req) => ({
      metric: req.metric,
      current: Math.min(Math.max(params.counters[req.metric] ?? 0, 0), req.target),
      target: req.target,
    }));

    const unlocked = params.awarded.has(rule.slug);
    const awardedAt = params.awarded.get(rule.slug);
    const totalTarget = requirements.reduce((sum, r) => sum + r.target, 0);
    const totalCurrent = requirements.reduce((sum, r) => sum + r.current, 0);
    const percent = unlocked ? 100 : Math.floor((100 * totalCurrent) / totalTarget);

    return {
      slug: rule.slug,
      points: rule.points,
      unlocked,
      ...(awardedAt ? { awardedAt } : {}),
      percent,
      requirements,
    };
  });
}
