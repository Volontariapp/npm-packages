import { describe, expect, it, beforeEach, afterEach, jest } from '@jest/globals';
import { EventQueuePusher } from '../../../pushers/event-queue.pusher.js';
import { makeLoggerMock } from '../../utils/helpers/shared/logger-mock.helper.js';
import { makeEventQueueEvent } from '../../utils/helpers/event/event-queue-event.helper.js';
import { clearTestRedis, testRedisOptions } from '../../redis-config.js';
import { ServiceType } from '@volontariapp/shared';
import { Redis } from 'ioredis';

describe('EventQueuePusher (Integration)', () => {
  let pusher: EventQueuePusher;
  let redis: Redis;
  const loggerMock = makeLoggerMock();

  beforeEach(async () => {
    // Arrange
    redis = new Redis({
      ...testRedisOptions,
      enableOfflineQueue: false,
    });
    await redis.connect();
    await clearTestRedis();
    pusher = new EventQueuePusher(loggerMock, redis);
  });

  afterEach(async () => {
    // Cleanup
    if (redis.status !== 'end') {
      await redis.quit();
    }
  });

  it('should push event to multiple streams in Redis', async () => {
    // Arrange
    const event = makeEventQueueEvent({
      id: 'evt-1',
      type: 'user.created',
      emitter: ServiceType.USER,
      targetServices: [ServiceType.POST, ServiceType.SOCIAL],
      payload: { after: { userId: '123' } },
    });

    // Act
    await pusher.pushElement(event);

    // Assert
    const postStream = await redis.xrange('stream:post', '-', '+');
    const socialStream = await redis.xrange('stream:social', '-', '+');

    expect(postStream).toHaveLength(1);
    expect(socialStream).toHaveLength(1);

    const postEntry = postStream[0][1];
    expect(postEntry).toContain('event');

    const eventJson = postEntry[postEntry.indexOf('event') + 1];
    const parsedEvent = JSON.parse(eventJson) as Record<string, unknown>;

    expect(parsedEvent.id).toBe('evt-1');
  });

  describe('Stress Tests', () => {
    it('should handle 500 events pushed in bulk across multiple services', async () => {
      // Arrange
      const count = 500;
      const services = [ServiceType.POST, ServiceType.USER, ServiceType.SOCIAL, ServiceType.EVENT];
      const events = Array.from({ length: count }).map((_, i) =>
        makeEventQueueEvent({
          id: `stress-${i.toString()}`,
          targetServices: [services[i % services.length]],
        }),
      );

      // Act
      await pusher.pushBulkElement(events);

      // Assert
      const results = await Promise.all(services.map((s) => redis.xlen(`stream:${s}`)));
      const totalInStreams = results.reduce((a, b) => a + b, 0);

      expect(totalInStreams).toBe(count);
    });
  });

  describe('Resilience Tests', () => {
    it('should recover after a temporary Redis failure', async () => {
      // Arrange
      const event1 = makeEventQueueEvent({ id: 'evt-1', targetServices: [ServiceType.POST] });
      const event2 = makeEventQueueEvent({ id: 'evt-2', targetServices: [ServiceType.POST] });

      // 1. Act: Normal push
      await pusher.pushElement(event1);
      expect(await redis.xlen('stream:post')).toBe(1);

      // 2. Act: Simulate failure via spy
      const loggerErrorSpy = jest.spyOn(loggerMock, 'error');
      jest.spyOn(redis, 'pipeline').mockImplementationOnce(() => {
        throw new Error('Redis connection lost');
      });

      // Assert: Should fail
      await expect(pusher.pushElement(event2)).rejects.toThrow('Redis connection lost');
      expect(loggerErrorSpy).toHaveBeenCalled();

      // 3. Act: Normal push again (spy was Once)
      await pusher.pushElement(event2);

      // Assert: Recovery successful
      expect(await redis.xlen('stream:post')).toBe(2);
    });
  });
});
