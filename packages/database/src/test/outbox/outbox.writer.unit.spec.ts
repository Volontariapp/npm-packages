import { describe, expect, it, jest, beforeEach } from '@jest/globals';
import { OutboxWriter } from '../../outbox/writer/outbox.writer.js';
import { OutboxModel } from '../../outbox/models/outbox.model.js';
import type { BaseRepository } from '../../core/base.repository.js';
import { OutboxEntity } from '../../outbox/entities/outbox.entity.js';
import { makeOutboxEvent } from '../utils/outbox-event.helper.js';
import { makeLoggerMock, type TestLoggerMock } from '../utils/logger-mock.helper.js';
import { makeExtendedOutboxEvent } from '../utils/extended-outbox-event.helper.js';
import { ExtendedOutboxModel } from '../example/models/extended-outbox.model.js';
import { ExtendedOutboxEntity } from '../example/entities/extended-outbox.entity.js';
import { UnprocessableEntityError } from '@volontariapp/errors';
import { Logger } from '@volontariapp/logger';
import { makeOutboxWriterRepositoryMock, OutboxWriterRepositoryMock, } from '../utils/outbox-writer-mock.helper.js';


describe('OutboxWriter (Unit)', () => {
  let writer: OutboxWriter<OutboxModel, OutboxEntity>;
  let repository: OutboxWriterRepositoryMock<OutboxModel, OutboxEntity>;
  let logger: TestLoggerMock;

  beforeEach(() => {
    repository = makeOutboxWriterRepositoryMock<OutboxModel, OutboxEntity>();

    logger = makeLoggerMock();

    writer = new OutboxWriter(
      logger as unknown as Logger,
      repository as unknown as BaseRepository<OutboxModel, OutboxEntity, string>,
    );
  });

  it('create() should delegate valid outbox events to the repository', async () => {
    const event = makeOutboxEvent({ createdAt: new Date(Date.now() - 60_000) });

    await writer.create(event);

    expect(repository.create).toHaveBeenCalledWith(event);
  });

  it('create() should reject future createdAt values', async () => {
    const event = makeOutboxEvent({ createdAt: new Date(Date.now() + 60_000) });

    try {
      await writer.create(event);
      throw new Error('Expected create() to throw');
    } catch (error) {
      expect(error).toBeInstanceOf(UnprocessableEntityError);
      expect((error as Error).message).toBe('Outbox createdAt cannot be in the future');
    }

    expect(repository.create).not.toHaveBeenCalled();
  });

  it('createMany() should reject the whole batch when one createdAt is in the future', async () => {
    const events = [
      makeOutboxEvent({ type: 'user.created', createdAt: new Date(Date.now() - 60_000) }),
      makeOutboxEvent({ type: 'user.updated', createdAt: new Date(Date.now() + 60_000) }),
    ];

    await expect(writer.createMany(events)).rejects.toThrow('Outbox createdAt cannot be in the future');
    expect(repository.createMany).not.toHaveBeenCalled();
    expect(logger.warn).toHaveBeenCalled();
  });

  it('createMany() should delegate valid events to the repository', async () => {
    const events = [
      makeOutboxEvent({ type: 'user.created', createdAt: new Date(Date.now() - 60_000) }),
      makeOutboxEvent({ type: 'user.updated', createdAt: new Date(Date.now() - 30_000) }),
    ];

    await writer.createMany(events);

    expect(repository.createMany).toHaveBeenCalledWith(events);
  });

  it('update() should delegate to the repository', async () => {
    const event = makeOutboxEvent({ id: 'event-id-1' });

    await writer.update(event);

    expect(repository.update).toHaveBeenCalledWith(event.id, event);
  });

  it('delete() should delegate to the repository', async () => {
    await writer.delete('event-id-2');

    expect(repository.delete).toHaveBeenCalledWith('event-id-2');
  });

  it('create() should log and rethrow repository errors', async () => {
    const event = makeOutboxEvent({ createdAt: new Date(Date.now() - 60_000) });
    const repositoryError = new Error('repository create failure');
    repository.create.mockRejectedValueOnce(repositoryError);

    await expect(writer.create(event)).rejects.toThrow('repository create failure');
    expect(logger.error).toHaveBeenCalledWith('Failed to create outbox event', repositoryError);
  });

  it('createMany() should log and rethrow repository errors', async () => {
    const events = [makeOutboxEvent({ createdAt: new Date(Date.now() - 60_000) })];
    const repositoryError = new Error('repository createMany failure');
    repository.createMany.mockRejectedValueOnce(repositoryError);

    await expect(writer.createMany(events)).rejects.toThrow('repository createMany failure');
    expect(logger.error).toHaveBeenCalledWith('Failed to create outbox events batch', repositoryError);
  });

  it('update() should log and rethrow repository errors', async () => {
    const event = makeOutboxEvent({ id: 'event-id-3' });
    const repositoryError = new Error('repository update failure');
    repository.update.mockRejectedValueOnce(repositoryError);

    await expect(writer.update(event)).rejects.toThrow('repository update failure');
    expect(logger.error).toHaveBeenCalledWith('Failed to update outbox event', repositoryError);
  });

  it('delete() should log and rethrow repository errors', async () => {
    const repositoryError = new Error('repository delete failure');
    repository.delete.mockRejectedValueOnce(repositoryError);

    await expect(writer.delete('event-id-4')).rejects.toThrow('repository delete failure');
    expect(logger.error).toHaveBeenCalledWith('Failed to delete outbox event', repositoryError);
  });
});

describe('OutboxWriter with extended types (Unit)', () => {
  it('should support an extended outbox model/entity pair across all writer methods', async () => {
    const repository = makeOutboxWriterRepositoryMock<ExtendedOutboxModel, ExtendedOutboxEntity>();
    const logger = makeLoggerMock();
    const writer = new OutboxWriter<ExtendedOutboxModel, ExtendedOutboxEntity>(
      logger,
      repository as unknown as BaseRepository<ExtendedOutboxModel, ExtendedOutboxEntity, string>,
    );
    const event = makeExtendedOutboxEvent({
      id: 'extended-1',
      type: 'extended.created',
      emitter: 'unit-tests',
      channel: 'sms',
      createdAt: new Date(Date.now() - 60_000),
    });
    const secondEvent = makeExtendedOutboxEvent({
      id: 'extended-2',
      type: 'extended.updated',
      emitter: 'unit-tests',
      channel: 'email',
      createdAt: new Date(Date.now() - 30_000),
    });

    await writer.create(event);
    await writer.createMany([event, secondEvent]);
    await writer.update(makeExtendedOutboxEvent({ ...event, channel: 'push' }));
    await writer.delete(event.id);

    expect(repository.create).toHaveBeenCalledWith(event);
    expect(repository.createMany).toHaveBeenCalledWith([event, secondEvent]);
    expect(repository.update).toHaveBeenCalled();
    expect(repository.delete).toHaveBeenCalledWith(event.id);
  });
});
