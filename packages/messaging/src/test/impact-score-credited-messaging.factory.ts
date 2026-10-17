import type { IUserImpactScoreCreditedPayload } from '../index.js';

export function buildUserImpactScoreCreditedPayload(
  overrides: Partial<IUserImpactScoreCreditedPayload> = {},
): IUserImpactScoreCreditedPayload {
  return {
    userId: 'user-456',
    eventId: 'event-789',
    scoreIncrement: 40,
    ...overrides,
  };
}
