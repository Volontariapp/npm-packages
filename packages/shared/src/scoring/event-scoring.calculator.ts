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
 * Calcule la distribution des points d'un événement (docs/scoring/03-formule.md).
 * Applique :
 * 1. Paliers de durée alpha
 * 2. Facteur de remplissage (1 + N/beta) borné
 * 3. Prime du créateur avec garde anti-Sybil (N >= 3)
 * 4. Décroissance en loi de puissance selon l'ordre d'inscription (e = 0.3)
 * 5. Plafonnement du premier inscrit à +100% de la moyenne avec redistribution
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
  let sumWeights = 0;
  for (let i = 1; i <= N; i += 1) {
    const w = 1 / Math.pow(i, exponent);
    weights.push(w);
    sumWeights += w;
  }

  // Parts fractionnaires initiales
  const shares: number[] = weights.map((w) => pool * (w / sumWeights));

  // Plafonnement du premier inscrit à +100% de la moyenne (2 * average)
  const avg = pool / N;
  const maxFirstShare = FIRST_ATTENDEE_MAX_RATIO * avg;
  if (shares[0] > maxFirstShare) {
    const excess = shares[0] - maxFirstShare;
    shares[0] = maxFirstShare;

    // Redistribution proportionnelle de l'excédent sur les rangs 2 à N
    let remainingWeightsSum = 0;
    for (let i = 1; i < N; i += 1) {
      remainingWeightsSum += weights[i];
    }

    if (remainingWeightsSum > 0) {
      for (let i = 1; i < N; i += 1) {
        shares[i] += excess * (weights[i] / remainingWeightsSum);
      }
    }
  }

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
