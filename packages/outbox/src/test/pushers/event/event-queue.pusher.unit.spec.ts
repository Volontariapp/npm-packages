import { describe, expect, it, beforeEach, jest } from '@jest/globals';
import { makeRedisMock, makePipelineMock } from '../../utils/helpers/shared/redis-mock.helper.js';
import { makeLoggerMock } from '../../utils/helpers/shared/logger-mock.helper.js';
import { makeEventQueueEvent } from '../../utils/helpers/event/event-queue-event.helper.js';
import { Streams } from '@volontariapp/shared';
import { EventQueuePusher } from '../../../pushers/event-queue.pusher.js';

describe('EventQueuePusher (Unit)', () => {
  let pusher: EventQueuePusher;
  const loggerMock = makeLoggerMock();
  const redisMock = makeRedisMock();

  let pipelineSpy: jest.SpiedFunction<typeof redisMock.pipeline>;
  let loggerErrorSpy: jest.SpiedFunction<typeof loggerMock.error>;

  beforeEach(() => {
    jest.clearAllMocks();

    pipelineSpy = jest.spyOn(redisMock, 'pipeline');
    loggerErrorSpy = jest.spyOn(loggerMock, 'error');

    pusher = new EventQueuePusher(loggerMock, redisMock);
  });

  it('should be defined', () => {
    expect(pusher).toBeDefined();
  });

  describe('pushElement', () => {
    it('should push an event to all target service streams', async () => {
      // Arrange
      const entity = makeEventQueueEvent({
        id: '1',
        type: 'test.event',
        emitter: Streams.SOCIAL_INTERACTIONS,
        emitterId: '00000000-0000-0000-0000-000000000000',
        targetServices: [Streams.SOCIAL_POSTS, Streams.USER_USERS],
      });

      const mockPipeline = makePipelineMock();
      mockPipeline.exec.mockResolvedValue([]);
      pipelineSpy.mockReturnValue(mockPipeline);

      const xaddSpy = jest.spyOn(mockPipeline, 'xadd');
      const execSpy = jest.spyOn(mockPipeline, 'exec');

      // Act
      await pusher.pushElement(entity);

      // Assert
      expect(pipelineSpy).toHaveBeenCalled();
      expect(xaddSpy).toHaveBeenCalledTimes(2);
      expect(xaddSpy).toHaveBeenCalledWith(
        'stream:social:posts',
        'MAXLEN',
        '~',
        10000,
        '*',
        'id',
        entity.id,
        'type',
        entity.type,
        'emitter',
        entity.emitter,
        'emitterId',
        entity.emitterId,
        'correlationId',
        entity.correlationId,
        'traceId',
        entity.traceId ?? '',
        'version',
        entity.version.toString(),
        'createdAt',
        entity.createdAt.toISOString(),
        'payload',
        expect.any(String),
        'event',
        expect.any(String),
      );
      expect(xaddSpy).toHaveBeenCalledWith(
        'stream:user:users',
        'MAXLEN',
        '~',
        10000,
        '*',
        'id',
        entity.id,
        'type',
        entity.type,
        'emitter',
        entity.emitter,
        'emitterId',
        entity.emitterId,
        'correlationId',
        entity.correlationId,
        'traceId',
        entity.traceId ?? '',
        'version',
        entity.version.toString(),
        'createdAt',
        entity.createdAt.toISOString(),
        'payload',
        expect.any(String),
        'event',
        expect.any(String),
      );
      expect(execSpy).toHaveBeenCalled();
    });

    it('should throw and log error if pipeline fails', async () => {
      // Arrange
      const entity = makeEventQueueEvent({ id: '1', targetServices: [Streams.SOCIAL_POSTS] });
      const error = new Error('Redis error');

      const mockPipeline = makePipelineMock();
      mockPipeline.exec.mockRejectedValueOnce(error);
      pipelineSpy.mockReturnValue(mockPipeline);

      const execSpy = jest.spyOn(mockPipeline, 'exec');

      // Act & Assert
      await expect(pusher.pushElement(entity)).rejects.toThrow('Redis error');
      expect(loggerErrorSpy).toHaveBeenCalledWith(
        expect.stringContaining('Failed to push event queue item 1'),
        expect.objectContaining({ error }),
      );
      expect(execSpy).toHaveBeenCalled();
    });
  });

  describe('pushBulkElement', () => {
    it('should push multiple events in a single pipeline', async () => {
      // Arrange
      const entities = [
        makeEventQueueEvent({ id: '1', targetServices: [Streams.SOCIAL_POSTS] }),
        makeEventQueueEvent({ id: '2', targetServices: [Streams.USER_USERS] }),
      ];

      const mockPipeline = makePipelineMock();
      mockPipeline.exec.mockResolvedValue([]);
      pipelineSpy.mockReturnValue(mockPipeline);

      const xaddSpy = jest.spyOn(mockPipeline, 'xadd');
      const execSpy = jest.spyOn(mockPipeline, 'exec');

      // Act
      await pusher.pushBulkElement(entities);

      // Assert
      expect(xaddSpy).toHaveBeenCalledTimes(2);
      expect(execSpy).toHaveBeenCalled();
    });

    it('should throw and log error if pipeline fails during bulk push', async () => {
      // Arrange
      const entities = [makeEventQueueEvent({ id: '1', targetServices: [Streams.SOCIAL_POSTS] })];
      const error = new Error('Bulk Redis error');

      const mockPipeline = makePipelineMock();
      mockPipeline.exec.mockRejectedValueOnce(error);
      pipelineSpy.mockReturnValue(mockPipeline);

      // Act & Assert
      await expect(pusher.pushBulkElement(entities)).rejects.toThrow('Bulk Redis error');
      expect(loggerErrorSpy).toHaveBeenCalledWith(
        expect.stringContaining('Failed to push bulk event queue items'),
        expect.objectContaining({ error }),
      );
    });

    it('should call exec once even with many entities across multiple target services', async () => {
      // Arrange
      const entities = [
        makeEventQueueEvent({
          id: '1',
          targetServices: [Streams.SOCIAL_POSTS, Streams.USER_USERS, Streams.SOCIAL_INTERACTIONS],
        }),
        makeEventQueueEvent({ id: '2', targetServices: [Streams.EVENT_CREATED] }),
      ];

      const mockPipeline = makePipelineMock();
      mockPipeline.exec.mockResolvedValue([]);
      pipelineSpy.mockReturnValue(mockPipeline);

      const xaddSpy = jest.spyOn(mockPipeline, 'xadd');
      const execSpy = jest.spyOn(mockPipeline, 'exec');

      // Act
      await pusher.pushBulkElement(entities);

      // Assert
      expect(pipelineSpy).toHaveBeenCalledTimes(1);
      expect(xaddSpy).toHaveBeenCalledTimes(4);
      expect(execSpy).toHaveBeenCalledTimes(1);
    });
  });

  describe('serialization', () => {
    it('should serialize all required RedisEventMessage fields into the xadd payload', async () => {
      // Arrange
      const now = new Date('2025-01-01T12:00:00.000Z');
      const entity = makeEventQueueEvent({
        id: 'evt-serial-1',
        type: 'user.created',
        emitter: 'ms-user',
        version: 2,
        traceId: 'trace-abc',
        targetServices: [Streams.SOCIAL_POSTS],
        payload: { after: { userId: '42' } },
        createdAt: now,
      });

      const mockPipeline = makePipelineMock();
      mockPipeline.exec.mockResolvedValue([]);
      pipelineSpy.mockReturnValue(mockPipeline);

      const xaddSpy = jest.spyOn(mockPipeline, 'xadd');

      // Act
      await pusher.pushElement(entity);

      // Assert
      expect(xaddSpy).toHaveBeenCalledTimes(1);

      const xaddArgs = xaddSpy.mock.calls[0];
      const rawPayload = xaddArgs[xaddArgs.length - 1] as string;
      const parsed = JSON.parse(rawPayload) as Record<string, unknown>;

      expect(xaddArgs).toContain('id');
      expect(xaddArgs).toContain('evt-serial-1');
      expect(xaddArgs).toContain('type');
      expect(xaddArgs).toContain('user.created');
      expect(xaddArgs).toContain('emitter');
      expect(xaddArgs).toContain('ms-user');
      expect(xaddArgs).toContain('emitterId');
      expect(xaddArgs).toContain('00000000-0000-0000-0000-000000000000');
      expect(xaddArgs).toContain('correlationId');
      expect(xaddArgs).toContain(entity.correlationId);
      expect(xaddArgs).toContain('traceId');
      expect(xaddArgs).toContain('trace-abc');
      expect(xaddArgs).toContain('version');
      expect(xaddArgs).toContain('2');
      expect(xaddArgs).toContain('createdAt');
      expect(xaddArgs).toContain('2025-01-01T12:00:00.000Z');

      const payloadIdx = xaddArgs.indexOf('payload');
      const payloadStr = xaddArgs[payloadIdx + 1] as string;
      expect(JSON.parse(payloadStr)).toEqual({ after: { userId: '42' } });

      expect(parsed.id).toBe('evt-serial-1');
      expect(parsed.type).toBe('user.created');
      expect(parsed.emitter).toBe('ms-user');
      expect(parsed.correlationId).toBe(entity.correlationId);
      expect(parsed.traceId).toBe('trace-abc');
      expect(parsed.version).toBe(2);
      expect(parsed.createdAt).toBe('2025-01-01T12:00:00.000Z');
      expect(parsed.payload).toEqual({ after: { userId: '42' } });
    });

    it('should omit traceId from serialized message when not set on entity', async () => {
      // Arrange
      const entity = makeEventQueueEvent({
        id: 'evt-no-trace',
        targetServices: [Streams.USER_USERS],
        traceId: undefined,
      });

      const mockPipeline = makePipelineMock();
      mockPipeline.exec.mockResolvedValue([]);
      pipelineSpy.mockReturnValue(mockPipeline);

      const xaddSpy = jest.spyOn(mockPipeline, 'xadd');

      // Act
      await pusher.pushElement(entity);

      // Assert
      const xaddArgs = xaddSpy.mock.calls[0];
      const rawPayload = xaddArgs[xaddArgs.length - 1] as string;
      const parsed = JSON.parse(rawPayload) as Record<string, unknown>;

      const traceIdIdx = xaddArgs.indexOf('traceId');
      expect(xaddArgs[traceIdIdx + 1]).toBe('');

      expect(parsed.traceId).toBeUndefined();
    });
  });

  describe('edge cases', () => {
    it('should return early and not call exec when targetServices is empty', async () => {
      // Arrange
      const entity = makeEventQueueEvent({ id: '1', targetServices: [] });

      const mockPipeline = makePipelineMock();
      pipelineSpy.mockReturnValue(mockPipeline);

      const xaddSpy = jest.spyOn(mockPipeline, 'xadd');
      const execSpy = jest.spyOn(mockPipeline, 'exec');

      // Act
      await pusher.pushElement(entity);

      // Assert
      expect(xaddSpy).not.toHaveBeenCalled();
      expect(execSpy).not.toHaveBeenCalled();
    });

    it('should throw and log error when pipeline returns partial errors', async () => {
      // Arrange
      const entity = makeEventQueueEvent({
        id: '1',
        targetServices: [Streams.SOCIAL_POSTS, Streams.USER_USERS],
      });

      const partialError = new Error('MAXLEN overflow');
      const mockPipeline = makePipelineMock();
      mockPipeline.exec.mockResolvedValue([
        [null, 'stream:social:posts-id'],
        [partialError, null],
      ]);
      pipelineSpy.mockReturnValue(mockPipeline);

      // Act & Assert
      await expect(pusher.pushElement(entity)).rejects.toThrow('MAXLEN overflow');
      expect(loggerErrorSpy).toHaveBeenCalled();
    });
  });
});
