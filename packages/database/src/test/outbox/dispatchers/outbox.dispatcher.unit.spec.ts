import { describe, expect, it, beforeEach, jest, afterEach } from '@jest/globals';
import { UnprocessableEntityError } from '@volontariapp/errors';
import { OutboxDispatcher } from '../../../outbox/dispatchers/outbox.dispatcher.js';
import { OutboxStatus } from '../../../outbox/types/outbox.status.js';
import { OutboxEntity } from '../../../outbox/entities/outbox.entity.js';
import type { OutboxModel } from '../../../outbox/models/outbox.model.js';
import { makeLoggerMock, type LoggerMock } from '../../utils/helpers/logger-mock.helper.js';
import {
  makeOutboxRepositoryMock,
  type OutboxRepositoryMock,
} from '../../utils/helpers/outbox-repository-mock.helper.js';

describe('OutboxDispatcher (Unit)', () => {
  let dispatcher: OutboxDispatcher<OutboxModel, OutboxEntity>;
  let repositoryMock: OutboxRepositoryMock<OutboxModel, OutboxEntity>;
  let loggerMock: LoggerMock;

  beforeEach(() => {
    loggerMock = makeLoggerMock();
    repositoryMock = makeOutboxRepositoryMock<OutboxModel, OutboxEntity>();
    dispatcher = new OutboxDispatcher(loggerMock, repositoryMock);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  const makeEntity = (status: OutboxStatus = OutboxStatus.PENDING): OutboxEntity => {
    const entity = new OutboxEntity();
    entity.id = 'test-id';
    entity.status = status;
    entity.attempts = 0;
    entity.updatedAt = new Date();
    return entity;
  };

  describe('markAsProcessing', () => {
    it('should mark entity as processing and update repository', async () => {
      const entity = makeEntity(OutboxStatus.PENDING);
      const updateSpy = jest.spyOn(repositoryMock, 'update');
      const infoSpy = jest.spyOn(loggerMock, 'info');

      await dispatcher.markAsProcessing(entity);

      expect(entity.status).toBe(OutboxStatus.PROCESSING);
      expect(updateSpy).toHaveBeenCalledWith(entity.id, entity);
      expect(infoSpy).toHaveBeenCalledWith('Marking outbox entity test-id as processing');
    });

    it('should throw UnprocessableEntityError and warn if entity is not in PENDING status', () => {
      const entity = makeEntity(OutboxStatus.PROCESSING);
      const warnSpy = jest.spyOn(loggerMock, 'warn');

      expect(() => dispatcher.markAsProcessing(entity)).toThrow(UnprocessableEntityError);

      expect(warnSpy).toHaveBeenCalledWith(
        'Attempted to mark entity as processed, but it is not in PENDING status.',
        { status: entity.status, id: entity.id },
      );
    });
  });

  describe('markAsFailed', () => {
    it('should mark entity as failed with error and update repository', async () => {
      const entity = makeEntity(OutboxStatus.PROCESSING);
      const error = 'Some error';
      const updateSpy = jest.spyOn(repositoryMock, 'update');
      const errorSpy = jest.spyOn(loggerMock, 'error');

      await dispatcher.markAsFailed(entity, error);

      expect(entity.status).toBe(OutboxStatus.FAILED);
      expect(entity.lastError).toBe(error);
      expect(entity.attempts).toBe(1);
      expect(updateSpy).toHaveBeenCalledWith(entity.id, entity);
      expect(errorSpy).toHaveBeenCalledWith('Marking outbox entity test-id as failed', {
        error,
      });
    });

    it('should throw UnprocessableEntityError and warn if entity is not in PROCESSING status', () => {
      const entity = makeEntity(OutboxStatus.PENDING);
      const warnSpy = jest.spyOn(loggerMock, 'warn');

      expect(() => dispatcher.markAsFailed(entity)).toThrow(UnprocessableEntityError);

      expect(warnSpy).toHaveBeenCalledWith(
        'Attempted to mark entity as failed, but it is not in PROCESSING status.',
        { status: OutboxStatus.PENDING, id: entity.id },
      );
    });
  });

  describe('markAsCompleted', () => {
    it('should mark entity as completed and update repository', async () => {
      const entity = makeEntity(OutboxStatus.PROCESSING);
      const updateSpy = jest.spyOn(repositoryMock, 'update');
      const infoSpy = jest.spyOn(loggerMock, 'info');

      await dispatcher.markAsCompleted(entity);

      expect(entity.status).toBe(OutboxStatus.COMPLETED);
      expect(updateSpy).toHaveBeenCalledWith(entity.id, entity);
      expect(infoSpy).toHaveBeenCalledWith('Marking outbox entity test-id as done');
    });

    it('should throw UnprocessableEntityError and warn if entity is not in PROCESSING status', () => {
      const entity = makeEntity(OutboxStatus.PENDING);
      const warnSpy = jest.spyOn(loggerMock, 'warn');

      expect(() => dispatcher.markAsCompleted(entity)).toThrow(UnprocessableEntityError);

      expect(warnSpy).toHaveBeenCalledWith(
        'Attempted to mark entity as done, but it is not in PROCESSING status.',
        { status: OutboxStatus.PENDING, id: entity.id },
      );
    });
  });
});
