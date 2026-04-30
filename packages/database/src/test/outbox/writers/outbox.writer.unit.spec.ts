import { describe, expect, it, beforeEach, jest, afterEach } from '@jest/globals';
import { OutboxWriter } from '../../../outbox/writers/outbox.writer.js';
import type { OutboxModel } from '../../../outbox/models/outbox.model.js';
import type { BaseRepository } from '../../../core/base.repository.js';
import type { OutboxEntity } from '../../../outbox/entities/outbox.entity.js';
import { makeOutboxEvent } from '../../utils/helpers/outbox-event.helper.js';
import { makeLoggerMock, type LoggerMock } from '../../utils/helpers/logger-mock.helper.js';
import { makeExtendedOutboxEvent } from '../../utils/helpers/extended-outbox-event.helper.js';
import type { ExtendedOutboxModel } from '../../example/models/extended-outbox.model.js';
import type { ExtendedOutboxEntity } from '../../example/entities/extended-outbox.entity.js';
import {
  makeOutboxRepositoryMock,
  type OutboxRepositoryMock,
} from '../../utils/helpers/outbox-repository-mock.helper.js';

describe('OutboxWriter (Unit)', () => {
  let writer: OutboxWriter<OutboxModel, OutboxEntity>;
  let repository: OutboxRepositoryMock<OutboxModel, OutboxEntity>;
  let logger: LoggerMock;

  beforeEach(() => {
    repository = makeOutboxRepositoryMock<OutboxModel, OutboxEntity>();
    logger = makeLoggerMock();
    writer = new OutboxWriter(logger, repository);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('create() should delegate valid outbox events to the repository', async () => {
    const event = makeOutboxEvent({ createdAt: new Date(Date.now() - 60_000) });
    const createSpy = jest.spyOn(repository, 'create');

    await writer.create(event);

    expect(createSpy).toHaveBeenCalledWith(event);
  });

  it('create() should reject future createdAt values', async () => {
    const event = makeOutboxEvent({ createdAt: new Date(Date.now() + 60_000) });
    const createSpy = jest.spyOn(repository, 'create');

    try {
      await writer.create(event);
      throw new Error('Expected create() to throw');
    } catch (error) {
      expect((error as Error).name).toBe('UnprocessableEntityError');
      expect((error as Error).message).toBe('Outbox createdAt cannot be in the future');
    }

    expect(createSpy).not.toHaveBeenCalled();
  });

  it('createMany() should reject the whole batch when one createdAt is in the future', async () => {
    const events = [
      makeOutboxEvent({ type: 'user.created', createdAt: new Date(Date.now() - 60_000) }),
      makeOutboxEvent({ type: 'user.updated', createdAt: new Date(Date.now() + 60_000) }),
    ];
    const createManySpy = jest.spyOn(repository, 'createMany');
    const warnSpy = jest.spyOn(logger, 'warn');

    await expect(writer.createMany(events)).rejects.toThrow(
      'Outbox createdAt cannot be in the future',
    );
    expect(createManySpy).not.toHaveBeenCalled();
    expect(warnSpy).toHaveBeenCalled();
  });

  it('createMany() should delegate valid events to the repository', async () => {
    const events = [
      makeOutboxEvent({ type: 'user.created', createdAt: new Date(Date.now() - 60_000) }),
      makeOutboxEvent({ type: 'user.updated', createdAt: new Date(Date.now() - 30_000) }),
    ];
    const createManySpy = jest.spyOn(repository, 'createMany');

    await writer.createMany(events);

    expect(createManySpy).toHaveBeenCalledWith(events);
  });

  it('update() should delegate to the repository', async () => {
    const event = makeOutboxEvent({ id: 'event-id-1' });
    const updateSpy = jest.spyOn(repository, 'update');

    await writer.update(event);

    expect(updateSpy).toHaveBeenCalledWith(event.id, event);
  });

  it('delete() should delegate to the repository', async () => {
    const deleteSpy = jest.spyOn(repository, 'delete');

    await writer.delete('event-id-2');

    expect(deleteSpy).toHaveBeenCalledWith('event-id-2');
  });

  it('create() should log and rethrow repository errors', async () => {
    const event = makeOutboxEvent({ createdAt: new Date(Date.now() - 60_000) });
    const repositoryError = new Error('repository create failure');
    const createSpy = jest.spyOn(repository, 'create').mockRejectedValueOnce(repositoryError);
    const errorSpy = jest.spyOn(logger, 'error');

    await expect(writer.create(event)).rejects.toThrow('repository create failure');
    expect(createSpy).toHaveBeenCalled();
    expect(errorSpy).toHaveBeenCalledWith('Failed to create outbox event', repositoryError);
  });

  it('createMany() should log and rethrow repository errors', async () => {
    const events = [makeOutboxEvent({ createdAt: new Date(Date.now() - 60_000) })];
    const repositoryError = new Error('repository createMany failure');
    const createManySpy = jest
      .spyOn(repository, 'createMany')
      .mockRejectedValueOnce(repositoryError);
    const errorSpy = jest.spyOn(logger, 'error');

    await expect(writer.createMany(events)).rejects.toThrow('repository createMany failure');
    expect(createManySpy).toHaveBeenCalled();
    expect(errorSpy).toHaveBeenCalledWith('Failed to create outbox events batch', repositoryError);
  });

  it('update() should log and rethrow repository errors', async () => {
    const event = makeOutboxEvent({ id: 'event-id-3' });
    const repositoryError = new Error('repository update failure');
    const updateSpy = jest.spyOn(repository, 'update').mockRejectedValueOnce(repositoryError);
    const errorSpy = jest.spyOn(logger, 'error');

    await expect(writer.update(event)).rejects.toThrow('repository update failure');
    expect(updateSpy).toHaveBeenCalled();
    expect(errorSpy).toHaveBeenCalledWith('Failed to update outbox event', repositoryError);
  });

  it('delete() should log and rethrow repository errors', async () => {
    const repositoryError = new Error('repository delete failure');
    const deleteSpy = jest.spyOn(repository, 'delete').mockRejectedValueOnce(repositoryError);
    const errorSpy = jest.spyOn(logger, 'error');

    await expect(writer.delete('event-id-4')).rejects.toThrow('repository delete failure');
    expect(deleteSpy).toHaveBeenCalled();
    expect(errorSpy).toHaveBeenCalledWith('Failed to delete outbox event', repositoryError);
  });
});

describe('OutboxWriter with extended types (Unit)', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('should support an extended outbox model/entity pair across all writer methods', async () => {
    const repository = makeOutboxRepositoryMock<ExtendedOutboxModel, ExtendedOutboxEntity>();
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

    const createSpy = jest.spyOn(repository, 'create');
    const createManySpy = jest.spyOn(repository, 'createMany');
    const updateSpy = jest.spyOn(repository, 'update');
    const deleteSpy = jest.spyOn(repository, 'delete');

    await writer.create(event);
    await writer.createMany([event, secondEvent]);
    await writer.update(makeExtendedOutboxEvent(Object.assign({}, event, { channel: 'push' })));
    await writer.delete(event.id);

    expect(createSpy).toHaveBeenCalledWith(event);
    expect(createManySpy).toHaveBeenCalledWith([event, secondEvent]);
    expect(updateSpy).toHaveBeenCalled();
    expect(deleteSpy).toHaveBeenCalledWith(event.id);
  });
});
