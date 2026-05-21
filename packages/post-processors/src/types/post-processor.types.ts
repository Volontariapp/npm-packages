import type { EventChangedPayload } from '@volontariapp/messaging';

export type RedisStreamFieldsArray = string[];

export interface RedisStreamEntry {
  id: string;
  fields: Record<string, string | undefined>;
}

export type RedisStreamRawEntry = [string, RedisStreamFieldsArray];

export type RedisStreamRawResponse = [string, RedisStreamRawEntry[]][];

export interface ClaimResult {
  claimedCount: number;
  errorCount: number;
}

export type ExtractPayload<T> = T extends EventChangedPayload<infer P> ? P : T;
