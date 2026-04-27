import { describe, expect, it, beforeEach } from '@jest/globals';
import {
  OutboxStatus,
  type BaseRepository,
  type EventQueueEntity,
  type EventQueueModel,
} from '@volontariapp/database';
import { EventQueueWriter } from '../../../writers/event-queue.writer.js';
import { makeEventQueueEvent } from '../../utils/helpers/event-queue-event.helper.js';
import { makeLoggerMock } from '../../utils/helpers/logger-mock.helper.js';
import {
  makeEventQueueRepositoryMock,
  type EventQueueRepositoryMock,
} from '../../utils/helpers/event-queue-repository-mock.helper.js';

describe('EventQueueWriter (Unit)', () => {
  let writer: EventQueueWriter;
  let repository: EventQueueRepositoryMock;

  beforeEach(() => {
    repository = makeEventQueueRepositoryMock();
    const logger = makeLoggerMock();
    writer = new EventQueueWriter(
      logger,
      repository as unknown as BaseRepository<EventQueueModel, EventQueueEntity, string>,
    );
  });

  it('create() should pass default values when not overridden', async () => {
    const event = makeEventQueueEvent();

    await writer.create(event);

    expect(repository.create).toHaveBeenCalledTimes(1);
    const created = repository.create.mock.calls[0][0];
    expect(created.status).toBe(OutboxStatus.PENDING);
    expect(created.attempts).toBe(0);
    expect(created.version).toBe(1);
    expect(created.payload).toEqual({ after: { id: 'entity-1', state: 'created' } });
  });

  it('create() should keep overridden values when provided', async () => {
    const event = makeEventQueueEvent({
      status: OutboxStatus.FAILED,
      attempts: 2,
      version: 7,
      payload: {
        before: { id: 'entity-1', state: 'draft' },
        after: { id: 'entity-1', state: 'published' },
      },
    });

    await writer.create(event);

    expect(repository.create).toHaveBeenCalledTimes(1);
    const created = repository.create.mock.calls[0][0];
    expect(created.status).toBe(OutboxStatus.FAILED);
    expect(created.attempts).toBe(2);
    expect(created.version).toBe(7);
    expect(created.payload).toEqual({
      before: { id: 'entity-1', state: 'draft' },
      after: { id: 'entity-1', state: 'published' },
    });
  });
});
