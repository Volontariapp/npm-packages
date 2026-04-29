import { describe, expect, it, beforeEach } from '@jest/globals';
import { OutboxDispatcher } from '../../../outbox/dispatchers/outbox.dispatcher.js';
import { OutboxStatus } from '../../../outbox/types/outbox.status.js';
import { OutboxEntity } from '../../../outbox/entities/outbox.entity.js';
import type { OutboxModel } from '../../../outbox/models/outbox.model.js';
import { makeLoggerMock, type TestLoggerMock } from '../../utils/helpers/logger-mock.helper.js';
import {
  makeOutboxRepositoryMock,
  type OutboxRepositoryMock,
} from '../../utils/helpers/outbox-repository-mock.helper.js';
import type { BaseRepository } from '../../../core/base.repository.js';

describe('OutboxDispatcher (Unit)', () => {
  let dispatcher: OutboxDispatcher<OutboxModel, OutboxEntity>;
  let repositoryMock: OutboxRepositoryMock<OutboxModel, OutboxEntity>;
  let loggerMock: TestLoggerMock;

  beforeEach(() => {
    loggerMock = makeLoggerMock();
    repositoryMock = makeOutboxRepositoryMock<OutboxModel, OutboxEntity>();
    dispatcher = new OutboxDispatcher(
      loggerMock as never,
      repositoryMock as unknown as BaseRepository<OutboxModel, OutboxEntity, string>,
    );
  });

  const makeEntity = (status: OutboxStatus = OutboxStatus.PENDING): OutboxEntity => {
    const entity = new OutboxEntity();
    entity.id = 'test-id';
    entity.status = status;
    entity.attempts = 0;
    entity.updatedAt = new Date();
    return entity;
  };

  describe('markAsProcessed', () => {
    it('should mark entity as processing and update repository', async () => {
      const entity = makeEntity(OutboxStatus.PENDING);
      await dispatcher.markAsProcessed(entity);

      expect(entity.status).toBe(OutboxStatus.PROCESSING);
      expect(repositoryMock.update).toHaveBeenCalledWith(entity.id, entity);
      expect(loggerMock.info).toHaveBeenCalledWith('Marking outbox entity test-id as processing');
    });

    it('should warn if entity is not in PENDING status', async () => {
      const entity = makeEntity(OutboxStatus.PROCESSING);
      await dispatcher.markAsProcessed(entity);

      expect(loggerMock.warn).toHaveBeenCalledWith(
        'Attempted to mark entity as processed, but it is not in PENDING status.',
      );
    });
  });

  describe('markAsFailed', () => {
    it('should mark entity as failed with error and update repository', async () => {
      const entity = makeEntity(OutboxStatus.PROCESSING);
      const error = 'Some error';
      await dispatcher.markAsFailed(entity, error);

      expect(entity.status).toBe(OutboxStatus.FAILED);
      expect(entity.lastError).toBe(error);
      expect(repositoryMock.update).toHaveBeenCalledWith(entity.id, entity);
      expect(loggerMock.error).toHaveBeenCalledWith('Marking outbox entity test-id as failed', {
        error,
      });
    });

    it('should warn if entity is not in PROCESSING status', async () => {
      const entity = makeEntity(OutboxStatus.PENDING);
      await dispatcher.markAsFailed(entity);

      expect(loggerMock.warn).toHaveBeenCalledWith(
        'Attempted to mark entity as failed, but it is not in PROCESSING status.',
      );
    });
  });

  describe('markAsDone', () => {
    it('should mark entity as completed and update repository', async () => {
      const entity = makeEntity(OutboxStatus.PROCESSING);
      await dispatcher.markAsDone(entity);

      expect(entity.status).toBe(OutboxStatus.COMPLETED);
      expect(repositoryMock.update).toHaveBeenCalledWith(entity.id, entity);
      expect(loggerMock.info).toHaveBeenCalledWith('Marking outbox entity test-id as done');
    });

    it('should warn if entity is not in PROCESSING status', async () => {
      const entity = makeEntity(OutboxStatus.PENDING);
      await dispatcher.markAsDone(entity);

      expect(loggerMock.warn).toHaveBeenCalledWith(
        'Attempted to mark entity as done, but it is not in PROCESSING status.',
      );
    });
  });
});
