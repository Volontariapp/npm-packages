import type { Redis } from 'ioredis';
import type { RedisStreamEntry, RedisStreamRawEntry } from '../../types/index.js';
import type { PendingMessageInfo } from '../../interfaces/index.js';

/** Result of an idempotency lock request, one per stream entry. */
export enum IdempotencyLockState {
  /** The lock is ours: process the event. */
  ACQUIRED = 'acquired',
  /** The event was already processed: acknowledge and skip. */
  DONE = 'done',
  /** Another delivery of the same event is being processed: do not acknowledge, retry later. */
  PROCESSING = 'processing',
}

export interface IdempotencyLockRequest {
  /** Id of the event (the event_queue row id), stable across pushes of the same event. */
  idempotencyId: string;
  /**
   * Redis message id, checked as the key of the previous version (one key per Redis message).
   * Leave it out when it is the idempotency id itself.
   */
  legacyMessageId?: string;
}

/**
 * Sets each lock to "processing" if absent, in one round trip. A key of the previous version
 * (Redis message id) means the message was handled before the upgrade: reported as done.
 * KEYS: pairs (event key, legacy key). ARGV[1]: processing ttl, ARGV[1 + i]: '1' to check the
 * legacy key of pair i.
 */
const ACQUIRE_LOCKS_SCRIPT = `
local out = {}
for i = 1, #KEYS / 2 do
  local key = KEYS[2 * i - 1]
  local legacy = KEYS[2 * i]
  if ARGV[i + 1] == '1' and redis.call('EXISTS', legacy) == 1 then
    out[i] = 'done'
  elseif redis.call('SET', key, 'processing', 'NX', 'EX', ARGV[1]) then
    out[i] = 'acquired'
  elseif redis.call('GET', key) == 'done' then
    out[i] = 'done'
  else
    out[i] = 'processing'
  end
end
return out
`;

const MARK_DONE_SCRIPT = `
for i = 1, #KEYS do
  redis.call('SET', KEYS[i], 'done', 'EX', ARGV[1])
end
return #KEYS
`;

const LOCK_STATES: ReadonlySet<string> = new Set(Object.values(IdempotencyLockState));

const isLockState = (value: unknown): value is IdempotencyLockState =>
  typeof value === 'string' && LOCK_STATES.has(value);

export class RedisStreamHelper {
  /**
   * Parses raw Redis Stream entries into a structured key-value object array.
   */
  static parseRawEntries(rawEntries: RedisStreamRawEntry[]): RedisStreamEntry[] {
    const entries: RedisStreamEntry[] = [];
    for (const [id, fieldsArray] of rawEntries) {
      const fields: Record<string, string> = {};
      for (let i = 0; i < fieldsArray.length; i += 2) {
        const key = fieldsArray[i];
        const val = fieldsArray[i + 1];
        if (key && val) {
          fields[key] = val;
        }
      }
      entries.push({ id, fields });
    }
    return entries;
  }

  /**
   * Retrieves pending messages info using XPENDING command.
   */
  static async getPendingMessages(
    redis: Redis,
    streamName: string,
    groupName: string,
    batchSize: number,
  ): Promise<PendingMessageInfo[]> {
    const rawPending = (await redis.call(
      'XPENDING',
      streamName,
      groupName,
      '-',
      '+',
      batchSize,
    )) as [string, string, number, number][] | null;

    if (!rawPending) return [];

    return rawPending.map(([messageId, consumerName, idleTimeMs, deliveryCount]) => ({
      messageId,
      consumerName,
      idleTimeMs: Number(idleTimeMs),
      deliveryCount: Number(deliveryCount),
    }));
  }

  /**
   * Total number of pending messages of a consumer group (summary form of XPENDING).
   * Throws when Redis answers something unexpected, so callers never mistake it for 0.
   */
  static async getPendingCount(
    redis: Redis,
    streamName: string,
    groupName: string,
  ): Promise<number> {
    const summary = (await redis.call('XPENDING', streamName, groupName)) as
      | [number | string, ...unknown[]]
      | null;
    const count = Array.isArray(summary) ? Number(summary[0]) : Number.NaN;
    if (!Number.isFinite(count)) {
      throw new Error(`Unexpected XPENDING summary for ${streamName}/${groupName}`);
    }
    return count;
  }

  /**
   * Number of entries in a stream (XLEN). A missing stream has length 0.
   */
  static async getStreamLength(redis: Redis, streamName: string): Promise<number> {
    const length = Number(await redis.call('XLEN', streamName));
    if (!Number.isFinite(length)) {
      throw new Error(`Unexpected XLEN reply for ${streamName}`);
    }
    return length;
  }

  /**
   * Claims a pending message using XCLAIM command.
   */
  static async claimMessage(
    redis: Redis,
    streamName: string,
    groupName: string,
    consumerName: string,
    claimMinIdleTimeMs: number,
    messageId: string,
  ): Promise<void> {
    await redis.call(
      'XCLAIM',
      streamName,
      groupName,
      consumerName,
      claimMinIdleTimeMs.toString(),
      messageId,
      'JUSTID',
    );
  }

  /**
   * Gets the Redis key for checking message idempotency.
   */
  static getIdempotencyKey(groupName: string, messageId: string): string {
    return `idempotency:post-processor:${groupName}:${messageId}`;
  }

  /**
   * Attempts to acquire an idempotency lock for a message.
   * Returns true if lock was successfully acquired (meaning message has not been processed yet).
   */
  static async acquireIdempotencyLock(
    redis: Redis,
    groupName: string,
    messageId: string,
    ttlSeconds: number,
  ): Promise<boolean> {
    const key = this.getIdempotencyKey(groupName, messageId);
    const result = await redis.call('SET', key, 'processing', 'NX', 'EX', ttlSeconds);
    return result === 'OK';
  }

  /**
   * The id that identifies the event across pushes: the `id` field set by the outbox pusher (the
   * event_queue row id), or the Redis message id when the field is missing.
   */
  static resolveIdempotencyId(entry: RedisStreamEntry): string {
    const eventId = entry.fields.id?.trim();
    return eventId !== undefined && eventId !== '' ? eventId : entry.id;
  }

  /**
   * Takes the "processing" lock of several events in one round trip and says, for each request in
   * order, whether to process it, skip it (already done) or leave it for later (being processed).
   * An unexpected reply counts as PROCESSING: the message is retried, never skipped.
   */
  static async acquireIdempotencyLocks(
    redis: Redis,
    groupName: string,
    requests: IdempotencyLockRequest[],
    processingTtlSeconds: number,
  ): Promise<IdempotencyLockState[]> {
    if (requests.length === 0) return [];
    const keys: string[] = [];
    const legacyFlags: string[] = [];
    for (const request of requests) {
      const key = this.getIdempotencyKey(groupName, request.idempotencyId);
      const legacyId = request.legacyMessageId;
      const checkLegacy = legacyId !== undefined && legacyId !== request.idempotencyId;
      keys.push(key, checkLegacy ? this.getIdempotencyKey(groupName, legacyId) : key);
      legacyFlags.push(checkLegacy ? '1' : '0');
    }
    const reply = await redis.call(
      'EVAL',
      ACQUIRE_LOCKS_SCRIPT,
      keys.length,
      ...keys,
      Math.max(1, Math.ceil(processingTtlSeconds)),
      ...legacyFlags,
    );
    const states = Array.isArray(reply) ? reply : [];
    return requests.map((_, index) => {
      const state: unknown = states[index];
      return isLockState(state) ? state : IdempotencyLockState.PROCESSING;
    });
  }

  /** Marks events as processed for `ttlSeconds`, in one round trip. */
  static async markIdempotencyDone(
    redis: Redis,
    groupName: string,
    idempotencyIds: string[],
    ttlSeconds: number,
  ): Promise<void> {
    if (idempotencyIds.length === 0) return;
    const keys = idempotencyIds.map((id) => this.getIdempotencyKey(groupName, id));
    await redis.call('EVAL', MARK_DONE_SCRIPT, keys.length, ...keys, ttlSeconds);
  }

  /**
   * Releases an idempotency lock for a message (e.g. if processing fails).
   */
  static async removeIdempotencyLock(
    redis: Redis,
    groupName: string,
    messageId: string,
  ): Promise<void> {
    const key = this.getIdempotencyKey(groupName, messageId);
    await redis.del(key);
  }
}
