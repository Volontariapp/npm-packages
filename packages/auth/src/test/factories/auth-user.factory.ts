import type { AuthUser } from '../../interfaces/auth-user.interface.js';

export const createAuthUser = (overrides?: Partial<AuthUser>): AuthUser => ({
  id: 'user-123',
  role: 'volunteer',
  ...overrides,
});
