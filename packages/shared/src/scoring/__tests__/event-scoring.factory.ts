import type { ComputeEventScoringParams, ScoringAttendeeInput } from '../interfaces.js';

export const SCORING_START_AT = new Date('2026-11-01T10:00:00Z');

const HOUR_MS = 3_600_000;

export function buildAttendees(count: number): ScoringAttendeeInput[] {
  return Array.from({ length: count }, (_, i) => ({
    userId: `u-${String(i + 1).padStart(3, '0')}`,
    registeredAt: new Date(SCORING_START_AT.getTime() - (count - i) * 60_000),
  }));
}

/** Builds params for a given attendee count, capacity and duration (alpha tier is derived from the duration). */
export function buildScoringParams(
  count: number,
  maxParticipants: number,
  durationHours: number,
  organizerId = 'org-1',
): ComputeEventScoringParams {
  return {
    attendees: buildAttendees(count),
    startAt: SCORING_START_AT,
    endAt: new Date(SCORING_START_AT.getTime() + durationHours * HOUR_MS),
    maxParticipants,
    organizerId,
  };
}
