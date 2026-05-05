import { describe, expect, it, beforeEach, jest } from '@jest/globals';
import { makeRedisMock, makePipelineMock } from '../utils/helpers/shared/redis-mock.helper.js';
import { makeLoggerMock } from '../utils/helpers/shared/logger-mock.helper.js';
import { makeEventQueueEvent } from '../utils/helpers/event/event-queue-event.helper.js';
import { ServiceType } from '@volontariapp/shared';
import { EventQueuePusher } from '../../pushers/event-queue.pusher.js';

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
      const entity = makeEventQueueEvent({
        id: '1',
        type: 'test.event',
        emitter: ServiceType.SOCIAL,
        targetServices: [ServiceType.POST, ServiceType.USER],
      });

      const mockPipeline = makePipelineMock();
      mockPipeline.exec.mockResolvedValue([]);
      pipelineSpy.mockReturnValue(mockPipeline);

      const xaddSpy = jest.spyOn(mockPipeline, 'xadd');
      const execSpy = jest.spyOn(mockPipeline, 'exec');

      await pusher.pushElement(entity);

      expect(pipelineSpy).toHaveBeenCalled();
      expect(xaddSpy).toHaveBeenCalledTimes(2);
      expect(xaddSpy).toHaveBeenCalledWith(
        'stream:post',
        'MAXLEN',
        '~',
        10000,
        '*',
        'event',
        expect.any(String),
      );
      expect(xaddSpy).toHaveBeenCalledWith(
        'stream:user',
        'MAXLEN',
        '~',
        10000,
        '*',
        'event',
        expect.any(String),
      );
      expect(execSpy).toHaveBeenCalled();
    });

    it('should throw and log error if pipeline fails', async () => {
      const entity = makeEventQueueEvent({ id: '1', targetServices: [ServiceType.POST] });
      const error = new Error('Redis error');

      const mockPipeline = makePipelineMock();
      mockPipeline.exec.mockRejectedValueOnce(error);
      pipelineSpy.mockReturnValue(mockPipeline);

      const execSpy = jest.spyOn(mockPipeline, 'exec');

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
      const entities = [
        makeEventQueueEvent({ id: '1', targetServices: [ServiceType.POST] }),
        makeEventQueueEvent({ id: '2', targetServices: [ServiceType.USER] }),
      ];

      const mockPipeline = makePipelineMock();
      mockPipeline.exec.mockResolvedValue([]);
      pipelineSpy.mockReturnValue(mockPipeline);

      const xaddSpy = jest.spyOn(mockPipeline, 'xadd');
      const execSpy = jest.spyOn(mockPipeline, 'exec');

      await pusher.pushBulkElement(entities);

      expect(xaddSpy).toHaveBeenCalledTimes(2);
      expect(execSpy).toHaveBeenCalled();
    });
  });
});
