import type { EventChangedPayload } from '@volontariapp/messaging';

export type ExtractPayload<T> = T extends EventChangedPayload<infer P> ? P : T;

/**
 * Represents the summary result of the Redis XPENDING command.
 * Format: [pendingCount, smallestId, greatestId, [[consumerName, pendingCount], ...]]
 */
export type RedisXPendingSummary = [
  pendingCount: number,
  smallestId: string | null,
  greatestId: string | null,
  consumers: Array<[consumerName: string, pendingCount: string]>,
];
