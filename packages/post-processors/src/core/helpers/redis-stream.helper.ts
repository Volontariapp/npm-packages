import type { Redis } from 'ioredis';
import type { RedisStreamEntry, RedisStreamRawEntry } from '../../types/index.js';
import type { PendingMessageInfo } from '../../interfaces/index.js';

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
