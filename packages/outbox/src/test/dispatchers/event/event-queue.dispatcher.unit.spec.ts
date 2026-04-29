import { describe, expect, it, beforeEach } from '@jest/globals';
import { UnprocessableEntityError } from '@volontariapp/errors';
import { EventQueueDispatcher } from '../../../dispatchers/event-queue.dispatcher.js';
import type { EventQueueEntity, EventQueueModel } from '@volontariapp/database';
import { OutboxStatus, type BaseRepository } from '@volontariapp/database';
import { makeLoggerMock } from '../../utils/helpers/logger-mock.helper.js';
import {
  makeEventQueueRepositoryMock,
  type EventQueueRepositoryMock,
} from '../../utils/helpers/event-queue-repository-mock.helper.js';
import { makeEventQueueEvent } from '../../utils/helpers/event-queue-event.helper.js';

describe('EventQueueDispatcher (Unit)', () => {
  let dispatcher: EventQueueDispatcher;
  let repositoryMock: EventQueueRepositoryMock;

  beforeEach(() => {
    repositoryMock = makeEventQueueRepositoryMock();
    const loggerMock = makeLoggerMock();
    dispatcher = new EventQueueDispatcher(
      loggerMock,
      repositoryMock as unknown as BaseRepository<EventQueueModel, EventQueueEntity, string>,
    );
  });

  describe('markAsProcessing', () => {
    it('should mark event as processing and update repository', async () => {
      const event = makeEventQueueEvent({ status: OutboxStatus.PENDING });
      await dispatcher.markAsProcessing(event);

      expect(event.status).toBe(OutboxStatus.PROCESSING);
      expect(repositoryMock.update).toHaveBeenCalledWith(event.id, event);
    });

    it('should throw UnprocessableEntityError if event is not in PENDING status', () => {
      const event = makeEventQueueEvent({ status: OutboxStatus.PROCESSING });
      expect(() => dispatcher.markAsProcessing(event)).toThrow(UnprocessableEntityError);
    });
  });

  describe('markAsFailed', () => {
    it('should mark event as failed with error and update repository', async () => {
      const event = makeEventQueueEvent({ status: OutboxStatus.PROCESSING });
      const error = 'Execution failed';
      await dispatcher.markAsFailed(event, error);

      expect(event.status).toBe(OutboxStatus.FAILED);
      expect(event.lastError).toBe(error);
      expect(repositoryMock.update).toHaveBeenCalledWith(event.id, event);
    });

    it('should throw UnprocessableEntityError if event is not in PROCESSING status', () => {
      const event = makeEventQueueEvent({ status: OutboxStatus.PENDING });
      expect(() => dispatcher.markAsFailed(event)).toThrow(UnprocessableEntityError);
    });
  });

  describe('markAsCompleted', () => {
    it('should mark event as completed and update repository', async () => {
      const event = makeEventQueueEvent({ status: OutboxStatus.PROCESSING });
      await dispatcher.markAsCompleted(event);

      expect(event.status).toBe(OutboxStatus.COMPLETED);
      expect(repositoryMock.update).toHaveBeenCalledWith(event.id, event);
    });

    it('should throw UnprocessableEntityError if event is not in PROCESSING status', () => {
      const event = makeEventQueueEvent({ status: OutboxStatus.PENDING });
      expect(() => dispatcher.markAsCompleted(event)).toThrow(UnprocessableEntityError);
    });
  });
});
