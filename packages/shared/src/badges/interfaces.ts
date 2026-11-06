import type { BadgeMetric } from './constants.js';

export interface BadgeRequirement {
  readonly metric: BadgeMetric;
  readonly target: number;
}

export interface BadgeRule {
  readonly slug: string;
  /** Points crédités à l'attribution, ajoutés à `total_impact_score`. */
  readonly points: number;
  /** Toutes les exigences doivent être atteintes (ET logique). */
  readonly requirements: readonly BadgeRequirement[];
}

export interface ComputeBadgeProgressParams {
  /** Valeurs des compteurs de l'utilisateur, par métrique. Une métrique absente vaut 0. */
  readonly counters: Readonly<Partial<Record<string, number>>>;
  /** Date d'attribution par slug de badge possédé. La présence de la clé suffit pour "débloqué". */
  readonly awarded: ReadonlyMap<string, Date | undefined>;
}

export interface BadgeRequirementProgress {
  readonly metric: BadgeMetric;
  readonly current: number;
  readonly target: number;
}

export interface BadgeProgressResult {
  readonly slug: string;
  readonly points: number;
  readonly unlocked: boolean;
  readonly awardedAt?: Date;
  /** Entier de 0 à 100. Toujours 100 si le badge est débloqué. */
  readonly percent: number;
  readonly requirements: readonly BadgeRequirementProgress[];
}
