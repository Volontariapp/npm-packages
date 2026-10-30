import {
  DURATION_ALPHA_TIERS,
  EXPONENT_DEFAULT,
  FIRST_ATTENDEE_MAX_RATIO,
  MIN_ATTENDEES_FOR_ORGANIZER_POINTS,
  SCORING_FORMULA_VERSION,
} from './constants.js';
import type {
  ComputeEventScoringParams,
  EventScoringResult,
  ScoredParticipant,
} from './interfaces.js';

export function computeDurationAlpha(durationHours: number): number {
  for (const tier of DURATION_ALPHA_TIERS) {
    if (durationHours <= tier.maxHours) {
      return tier.alpha;
    }
  }
  return 4.0;
}

/**
 * Répartit `pool` proportionnellement à `weights` (décroissants) en bornant chaque part à
 * FIRST_ATTENDEE_MAX_RATIO x moyenne. L'excédent des parts plafonnées est redistribué au prorata
 * des poids des rangs non encore plafonnés ; on répète tant qu'une part dépasse le plafond.
 * La somme des parts reste égale à `pool` et le résultat est non croissant par rang.
 */
function capSharesToMaxRatio(weights: readonly number[], pool: number): number[] {
  const count = weights.length;
  const cap = (FIRST_ATTENDEE_MAX_RATIO * pool) / count;
  const capped: boolean[] = weights.map(() => false);
  const shares: number[] = weights.map(() => 0);

  for (;;) {
    let cappedCount = 0;
    let uncappedWeights = 0;
    for (let i = 0; i < count; i += 1) {
      if (capped[i]) {
        cappedCount += 1;
      } else {
        uncappedWeights += weights[i];
      }
    }
    if (uncappedWeights <= 0) {
      break;
    }

    const remaining = pool - cappedCount * cap;
    let newlyCapped = false;
    for (let i = 0; i < count; i += 1) {
      if (capped[i]) {
        shares[i] = cap;
        continue;
      }
      shares[i] = remaining * (weights[i] / uncappedWeights);
      if (shares[i] > cap) {
        capped[i] = true;
        newlyCapped = true;
      }
    }
    if (!newlyCapped) {
      break;
    }
  }

  return shares;
}

/**
 * Calcule la distribution des points d'un événement (docs/scoring/03-formule.md).
 * Applique :
 * 1. Paliers de durée alpha
 * 2. Facteur de remplissage (1 + N/beta) borné
 * 3. Prime du créateur avec garde anti-Sybil (N >= 3)
 * 4. Décroissance en loi de puissance selon l'ordre d'inscription (e = 0.3)
 * 5. Plafonnement de CHAQUE rang à +100% de la moyenne (2 x pool / N) avec redistribution
 *    proportionnelle aux poids des rangs non plafonnés, répétée jusqu'à stabilité (water-filling)
 * 6. Méthode du plus grand reste (Hare-Niemeyer) pour que la somme égale strictement le pool
 */
export function computeEventScoring(params: ComputeEventScoringParams): EventScoringResult {
  const start = new Date(params.startAt);
  const end = new Date(params.endAt);
  const durationMs = Math.max(0, end.getTime() - start.getTime());
  const durationHours = durationMs / (1000 * 60 * 60);
  const alpha = computeDurationAlpha(durationHours);

  // Exclure l'organisateur des participants si présent
  const eligibleAttendees = params.attendees.filter(
    (attendee) => !params.organizerId || attendee.userId !== params.organizerId,
  );

  // Tri déterministe et stable : registeredAt croissant, puis userId
  const sortedAttendees = [...eligibleAttendees].sort((left, right) => {
    const timeA = new Date(left.registeredAt).getTime();
    const timeB = new Date(right.registeredAt).getTime();
    return timeA - timeB || left.userId.localeCompare(right.userId);
  });

  const N = sortedAttendees.length;
  if (N === 0) {
    return {
      formulaVersion: SCORING_FORMULA_VERSION,
      pool: 0,
      organizerPoints: 0,
      participants: [],
    };
  }

  const beta = params.maxParticipants > 0 ? params.maxParticipants : 0;
  const fillRatio = beta > 0 ? Math.min(1, N / beta) : 0;
  const multiplier = 1 + fillRatio;

  // Prime du créateur (0 point si N < 3 pour protection anti-Sybil)
  const organizerPoints =
    N >= MIN_ATTENDEES_FOR_ORGANIZER_POINTS ? Math.round(150 * alpha * multiplier) : 0;

  // Prize pool global des participants
  const pool = Math.round(N * 100 * alpha * multiplier);

  if (pool === 0) {
    return {
      formulaVersion: SCORING_FORMULA_VERSION,
      pool: 0,
      organizerPoints,
      participants: sortedAttendees.map((attendee, index) => ({
        userId: attendee.userId,
        rank: index + 1,
        points: 0,
      })),
    };
  }

  // Cas limite N = 1 : le seul participant empoche l'intégralité du pool
  if (N === 1) {
    return {
      formulaVersion: SCORING_FORMULA_VERSION,
      pool,
      organizerPoints,
      participants: [
        {
          userId: sortedAttendees[0].userId,
          rank: 1,
          points: pool,
        },
      ],
    };
  }

  // Loi de puissance w_i = 1 / (i^e)
  const exponent = params.exponent ?? EXPONENT_DEFAULT;
  const weights: number[] = [];
  for (let i = 1; i <= N; i += 1) {
    weights.push(1 / Math.pow(i, exponent));
  }

  // Parts fractionnaires avec plafonnement de chaque rang (water-filling)
  const shares = capSharesToMaxRatio(weights, pool);

  // Méthode du plus grand reste (Hare-Niemeyer) pour garantir somme(P_i) == pool
  const floorShares: number[] = shares.map((s) => Math.floor(s));
  const remainders: Array<{ index: number; remainder: number }> = shares.map((s, index) => ({
    index,
    remainder: s - floorShares[index],
  }));

  const currentSum = floorShares.reduce((acc, val) => acc + val, 0);
  const missingPoints = pool - currentSum;

  // Tri par reste décroissant, départage par rang croissant (index croissant)
  remainders.sort((a, b) => b.remainder - a.remainder || a.index - b.index);

  for (let i = 0; i < missingPoints; i += 1) {
    const targetIndex = remainders[i].index;
    floorShares[targetIndex] += 1;
  }

  const participants: ScoredParticipant[] = sortedAttendees.map((attendee, index) => ({
    userId: attendee.userId,
    rank: index + 1,
    points: floorShares[index],
  }));

  return {
    formulaVersion: SCORING_FORMULA_VERSION,
    pool,
    organizerPoints,
    participants,
  };
}
