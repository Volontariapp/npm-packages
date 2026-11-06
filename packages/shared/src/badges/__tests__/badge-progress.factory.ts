import type { ComputeBadgeProgressParams } from '../interfaces.js';

export function buildBadgeProgressParams(
  overrides: Partial<ComputeBadgeProgressParams> = {},
): ComputeBadgeProgressParams {
  return {
    counters: {},
    awarded: new Map<string, Date | undefined>(),
    ...overrides,
  };
}
