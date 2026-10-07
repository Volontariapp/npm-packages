import type { IBadgePayload, IUserBadgeAwardedPayload } from '../index.js';

export function buildBadgePayload(overrides: Partial<IBadgePayload> = {}): IBadgePayload {
  return {
    id: 'badge-123',
    name: 'Bâtisseur·se',
    slug: 'EVENT_HOST_COUNT_1',
    description: 'Créer 1 événement',
    ...overrides,
  };
}

export function buildUserBadgeAwardedPayload(
  overrides: Partial<IUserBadgeAwardedPayload> = {},
): IUserBadgeAwardedPayload {
  return {
    userId: 'user-456',
    badges: [buildBadgePayload()],
    ...overrides,
  };
}
