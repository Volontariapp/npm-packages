import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import type { Redis } from 'ioredis';
import { createMock } from '@volontariapp/testing';
import { RedisStreamHelper } from '../../../../core/helpers/redis-stream.helper.js';
import type { RedisStreamRawEntry } from '../../../../types/index.js';

describe('RedisStreamHelper — Unit', () => {
  let redisMock: jest.Mocked<Redis>;

  beforeEach(() => {
    redisMock = createMock<Redis>();
  });

  describe('parseRawEntries', () => {
    it('should parse raw Redis Stream entries correctly', () => {
      const rawEntries: RedisStreamRawEntry[] = [
        ['1-0', ['id', 'evt-1', 'type', 'test-event', 'event', '{"foo":"bar"}']],
      ];

      const result = RedisStreamHelper.parseRawEntries(rawEntries);

      expect(result).toHaveLength(1);
      expect(result[0]?.id).toBe('1-0');
      expect(result[0]?.fields).toEqual({
        id: 'evt-1',
        type: 'test-event',
        event: '{"foo":"bar"}',
      });
    });

    it('should ignore keys with missing values', () => {
      const rawEntries: RedisStreamRawEntry[] = [
        [
          '2-0',
          ['id', 'evt-2', 'missingVal'], // uneven array elements
        ],
      ];

      const result = RedisStreamHelper.parseRawEntries(rawEntries);

      expect(result).toHaveLength(1);
      expect(result[0]?.fields).toEqual({
        id: 'evt-2',
      });
    });

    it('should return empty array if rawEntries is empty', () => {
      const result = RedisStreamHelper.parseRawEntries([]);
      expect(result).toEqual([]);
    });
  });

  describe('getPendingMessages', () => {
    it('should retrieve pending messages using XPENDING and parse them correctly', async () => {
      const rawPendingResponse = [
        ['1-0', 'consumer-1', 2500, 3],
        ['2-0', 'consumer-2', 5000, 1],
      ];
      redisMock.call.mockResolvedValue(rawPendingResponse);
      const callSpy = jest.spyOn(redisMock, 'call');

      const result = await RedisStreamHelper.getPendingMessages(
        redisMock,
        'stream:test',
        'group:test',
        10,
      );

      expect(callSpy).toHaveBeenCalledWith('XPENDING', 'stream:test', 'group:test', '-', '+', 10);
      expect(result).toHaveLength(2);
      expect(result[0]).toEqual({
        messageId: '1-0',
        consumerName: 'consumer-1',
        idleTimeMs: 2500,
        deliveryCount: 3,
      });
    });

    it('should return empty array if XPENDING returns null', async () => {
      redisMock.call.mockResolvedValue(null);

      const result = await RedisStreamHelper.getPendingMessages(
        redisMock,
        'stream:test',
        'group:test',
        10,
      );

      expect(result).toEqual([]);
    });
  });

  describe('claimMessage', () => {
    it('should invoke XCLAIM with JUSTID option', async () => {
      redisMock.call.mockResolvedValue('1-0');
      const callSpy = jest.spyOn(redisMock, 'call');

      await RedisStreamHelper.claimMessage(
        redisMock,
        'stream:test',
        'group:test',
        'consumer-1',
        1000,
        '1-0',
      );

      expect(callSpy).toHaveBeenCalledWith(
        'XCLAIM',
        'stream:test',
        'group:test',
        'consumer-1',
        '1000',
        '1-0',
        'JUSTID',
      );
    });
  });

  describe('getIdempotencyKey', () => {
    it('should format key correctly', () => {
      const key = RedisStreamHelper.getIdempotencyKey('group:test', '1-0');
      expect(key).toBe('idempotency:post-processor:group:test:1-0');
    });
  });

  describe('acquireIdempotencyLock', () => {
    it('should return true if lock acquisition returns OK', async () => {
      redisMock.call.mockResolvedValue('OK');
      const callSpy = jest.spyOn(redisMock, 'call');

      const result = await RedisStreamHelper.acquireIdempotencyLock(
        redisMock,
        'group:test',
        '1-0',
        60,
      );

      expect(callSpy).toHaveBeenCalledWith(
        'SET',
        'idempotency:post-processor:group:test:1-0',
        'processing',
        'NX',
        'EX',
        60,
      );
      expect(result).toBe(true);
    });

    it('should return false if lock acquisition fails', async () => {
      redisMock.call.mockResolvedValue(null);

      const result = await RedisStreamHelper.acquireIdempotencyLock(
        redisMock,
        'group:test',
        '1-0',
        60,
      );

      expect(result).toBe(false);
    });
  });

  describe('removeIdempotencyLock', () => {
    it('should delete the idempotency key', async () => {
      redisMock.del.mockResolvedValue(1);
      const delSpy = jest.spyOn(redisMock, 'del');

      await RedisStreamHelper.removeIdempotencyLock(redisMock, 'group:test', '1-0');

      expect(delSpy.mock.calls[0]).toEqual(['idempotency:post-processor:group:test:1-0']);
    });
  });
});
