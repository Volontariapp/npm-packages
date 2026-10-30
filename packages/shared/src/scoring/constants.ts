export const SCORING_FORMULA_VERSION = 1;
export const EXPONENT_DEFAULT = 0.3;
// Plafond de chaque rang (pas seulement le premier) à +100% de la moyenne (pool / N)
export const FIRST_ATTENDEE_MAX_RATIO = 2.0;
export const MIN_ATTENDEES_FOR_ORGANIZER_POINTS = 3; // Règle anti-Sybil

export interface DurationAlphaTier {
  readonly maxHours: number;
  readonly alpha: number;
}

export const DURATION_ALPHA_TIERS: readonly DurationAlphaTier[] = [
  { maxHours: 2, alpha: 1.0 },
  { maxHours: 4, alpha: 1.5 },
  { maxHours: 24, alpha: 2.5 },
  { maxHours: Infinity, alpha: 4.0 },
];
