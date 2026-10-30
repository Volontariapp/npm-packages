export interface ScoringAttendeeInput {
  readonly userId: string;
  readonly registeredAt: Date | string | number;
}

export interface ComputeEventScoringParams {
  readonly attendees: readonly ScoringAttendeeInput[];
  readonly startAt: Date | string | number;
  readonly endAt: Date | string | number;
  readonly maxParticipants: number;
  readonly organizerId?: string;
  readonly exponent?: number;
}

export interface ScoredParticipant {
  readonly userId: string;
  readonly rank: number;
  readonly points: number;
}

export interface EventScoringResult {
  readonly formulaVersion: number;
  readonly pool: number;
  readonly organizerPoints: number;
  readonly participants: readonly ScoredParticipant[];
}
