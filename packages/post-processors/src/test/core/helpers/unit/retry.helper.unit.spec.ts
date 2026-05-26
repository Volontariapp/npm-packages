import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import type { Redis } from 'ioredis';
import { createMock } from '@volontariapp/testing';
import { RetryHelper } from '../../../../core/helpers/retry.helper.js';
import type { ParseResult } from '../../../../types/index.js';

describe('RetryHelper — Unit', () => {
  let redisMock: jest.Mocked<Redis>;
  let helper: RetryHelper;

  beforeEach(() => {
    redisMock = createMock<Redis>();
    helper = new RetryHelper({
      maxRetries: 3,
      initialDelayMs: 1000,
      maxDelayMs: 5000,
      backoffMultiplier: 2,
      enableDlq: true,
    });
  });

  describe('calculateDelay', () => {
    it('should calculate exponential backoff delay correctly', () => {
      expect(helper.calculateDelay(1)).toBe(2000);
      expect(helper.calculateDelay(2)).toBe(4000);
    });

    it('should cap delay at maxDelayMs', () => {
      expect(helper.calculateDelay(3)).toBe(5000);
      expect(helper.calculateDelay(10)).toBe(5000);
    });
  });

  describe('getDlqStreamName', () => {
    it('should append -dlq suffix to stream name', () => {
      expect(helper.getDlqStreamName('orders-stream')).toBe('orders-stream-dlq');
    });
  });

  describe('recordRetry', () => {
    it('should increment attempt count and set last error with TTL', async () => {
      redisMock.incr.mockResolvedValue(2);
      redisMock.set.mockResolvedValue('OK');
      redisMock.expire.mockResolvedValue(1);

      const incrSpy = jest.spyOn(redisMock, 'incr');
      const setSpy = jest.spyOn(redisMock, 'set');
      const expireSpy = jest.spyOn(redisMock, 'expire');

      const err = new Error('Database connection failed');
      const attempt = await helper.recordRetry(redisMock, 'group-a', 'msg-1', err, 3600);

      expect(attempt).toBe(2);
      expect(incrSpy.mock.calls[0]).toEqual(['retry:post-processor:group-a:msg-1:attempt']);
      expect(setSpy.mock.calls[0]).toEqual([
        'retry:post-processor:group-a:msg-1:lastError',
        'Database connection failed',
        'EX',
        3600,
      ]);
      expect(expireSpy.mock.calls[0]).toEqual(['retry:post-processor:group-a:msg-1', 3600]);
    });
  });

  describe('getRetryMetadata', () => {
    it('should return null if no retry attempts recorded', async () => {
      redisMock.get.mockResolvedValue(null);

      const metadata = await helper.getRetryMetadata(redisMock, 'group-a', 'msg-1');

      expect(metadata).toBeNull();
    });

    it('should return full metadata if attempts are found', async () => {
      redisMock.get.mockResolvedValueOnce('2').mockResolvedValueOnce('Last connection error');

      const before = Date.now();
      const metadata = await helper.getRetryMetadata(redisMock, 'group-a', 'msg-1');
      const after = Date.now();

      expect(metadata).not.toBeNull();
      if (metadata) {
        expect(metadata.attemptCount).toBe(2);
        expect(metadata.lastError).toBe('Last connection error');
        expect(metadata.nextRetryTimestamp).toBeGreaterThanOrEqual(before + 4000);
        expect(metadata.nextRetryTimestamp).toBeLessThanOrEqual(after + 4000);
      }
    });
  });

  describe('enqueueForRetry', () => {
    it('should add message id to sorted set with calculated timestamp score', async () => {
      redisMock.zadd.mockResolvedValue('1');
      const zaddSpy = jest.spyOn(redisMock, 'zadd');

      const before = Date.now();
      await helper.enqueueForRetry(redisMock, 'group-a', 'msg-1', 1);

      expect(zaddSpy).toHaveBeenCalled();
      const calls = zaddSpy.mock.calls;
      expect(calls[0]?.[0]).toBe('retry-queue:post-processor:group-a');
      const score = Number(calls[0]?.[1]);
      expect(score).toBeGreaterThanOrEqual(before + 2000);
      expect(score).toBeLessThanOrEqual(Date.now() + 2000);
      expect(calls[0]?.[2]).toBe('msg-1');
    });
  });

  describe('getReadyForRetry', () => {
    it('should fetch ready messages and remove them from sorted set', async () => {
      redisMock.zrangebyscore.mockResolvedValue(['msg-1', 'msg-2']);
      redisMock.zrem.mockResolvedValue(2);

      const zrangeSpy = jest.spyOn(redisMock, 'zrangebyscore');
      const zremSpy = jest.spyOn(redisMock, 'zrem');

      const ready = await helper.getReadyForRetry(redisMock, 'group-a');

      expect(ready).toEqual(['msg-1', 'msg-2']);
      expect(zrangeSpy.mock.calls[0]).toEqual([
        'retry-queue:post-processor:group-a',
        '-inf',
        expect.any(Number),
      ]);
      expect(zremSpy.mock.calls[0]).toEqual([
        'retry-queue:post-processor:group-a',
        'msg-1',
        'msg-2',
      ]);
    });

    it('should return empty array if no messages ready', async () => {
      redisMock.zrangebyscore.mockResolvedValue([]);
      const zremSpy = jest.spyOn(redisMock, 'zrem');

      const ready = await helper.getReadyForRetry(redisMock, 'group-a');

      expect(ready).toEqual([]);
      expect(zremSpy).not.toHaveBeenCalled();
    });
  });

  describe('shouldRetry', () => {
    it('should return true if attemptCount is less than maxRetries', () => {
      expect(helper.shouldRetry(1)).toBe(true);
      expect(helper.shouldRetry(2)).toBe(true);
      expect(helper.shouldRetry(3)).toBe(false);
    });
  });

  describe('clearRetryData', () => {
    it('should delete all related keys and remove from sorted set', async () => {
      redisMock.del.mockResolvedValue(1);
      redisMock.zrem.mockResolvedValue(1);

      const delSpy = jest.spyOn(redisMock, 'del');
      const zremSpy = jest.spyOn(redisMock, 'zrem');

      await helper.clearRetryData(redisMock, 'group-a', 'msg-1');

      const delCalls = delSpy.mock.calls;
      expect(delCalls).toHaveLength(3);
      expect(delCalls[0]).toEqual(['retry:post-processor:group-a:msg-1:attempt']);
      expect(delCalls[1]).toEqual(['retry:post-processor:group-a:msg-1:lastError']);
      expect(delCalls[2]).toEqual(['retry:post-processor:group-a:msg-1']);
      expect(zremSpy.mock.calls[0]).toEqual(['retry-queue:post-processor:group-a', 'msg-1']);
    });
  });

  describe('sendToDlq', () => {
    const payload: ParseResult = {
      success: true,
      id: 'evt-1',
      type: 'order.created',
      payload: JSON.stringify({ data: { test: true } }),
    };

    it('should format payload and call xadd if DLQ is enabled', async () => {
      redisMock.xadd.mockResolvedValue('dlq-id-123');
      const xaddSpy = jest.spyOn(redisMock, 'xadd');

      const resultId = await helper.sendToDlq(
        redisMock,
        'orders-stream-dlq',
        'msg-1',
        payload,
        'Some test failure message',
      );

      expect(resultId).toBe('dlq-id-123');
      expect(xaddSpy.mock.calls[0]).toEqual([
        'orders-stream-dlq',
        '*',
        'messageId',
        'msg-1',
        'error',
        'Some test failure message',
        'payload',
        JSON.stringify(payload),
        'timestamp',
        expect.any(String),
      ]);
    });

    it('should return original messageId and skip call if DLQ is disabled', async () => {
      const disabledHelper = new RetryHelper({
        maxRetries: 3,
        initialDelayMs: 1000,
        maxDelayMs: 5000,
        backoffMultiplier: 2,
        enableDlq: false,
      });

      const xaddSpy = jest.spyOn(redisMock, 'xadd');

      const resultId = await disabledHelper.sendToDlq(
        redisMock,
        'orders-stream-dlq',
        'msg-1',
        payload,
        'Some test failure message',
      );

      expect(resultId).toBe('msg-1');
      expect(xaddSpy).not.toHaveBeenCalled();
    });
  });

  describe('normalizeRetryOptions', () => {
    it('should return default values when options are undefined', () => {
      const normalized = RetryHelper.normalizeRetryOptions();
      expect(normalized).toEqual({
        maxRetries: 5,
        initialDelayMs: 1000,
        maxDelayMs: 60000,
        backoffMultiplier: 2,
        enableDlq: true,
      });
    });

    it('should preserve provided options and fill in defaults for missing values', () => {
      const normalized = RetryHelper.normalizeRetryOptions({
        maxRetries: 10,
        enableDlq: false,
      });
      expect(normalized).toEqual({
        maxRetries: 10,
        initialDelayMs: 1000,
        maxDelayMs: 60000,
        backoffMultiplier: 2,
        enableDlq: false,
      });
    });
  });
});
