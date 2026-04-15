import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import type { BaseRepository } from '../../core/base.repository.js';
import type { OutboxModel } from '../../outbox/models/outbox.model.js';
import { OutboxWriter } from '../../outbox/writer/outbox.writer.js';
import { OutboxModelStatus } from '../../outbox/types/outbox-model.status.js';

type OutboxWriterRepository = ConstructorParameters<typeof OutboxWriter<OutboxModel>>[0];

const makeOutboxEvent = (overrides: Partial<OutboxModel> = {}): OutboxModel => ({
  id: 'evt-1',
  status: OutboxModelStatus.PENDING,
  attemps: 0,
  type: 'user.created',
  emitter: 'database-tests',
  createdAt: new Date(),
  ...overrides,
});

describe('Outbox Writer', () => {
  let outboxWriter: OutboxWriter<OutboxModel>;
  let repository: OutboxWriterRepository;

  beforeEach(() => {
    repository = {
      create: jest.fn().mockResolvedValue(undefined),
      createMany: jest.fn().mockResolvedValue(undefined),
    } as unknown as BaseRepository<OutboxModel, never, string> as OutboxWriterRepository;

    outboxWriter = new OutboxWriter(repository);
  });

  it('create() should delegate to repository.create()', async () => {
    const event = makeOutboxEvent();

    await outboxWriter.create(event);

    expect(repository.create).toHaveBeenCalledTimes(1);
    expect(repository.create).toHaveBeenCalledWith(event);
  });

  it('createMany() should delegate to repository.createMany()', async () => {
    const events = [
      makeOutboxEvent({ id: 'evt-1', type: 'user.created' }),
      makeOutboxEvent({
        id: 'evt-2',
        type: 'user.updated',
        status: OutboxModelStatus.PROCESSING,
        attemps: 2,
      }),
    ];

    await outboxWriter.createMany(events);

    expect(repository.createMany).toHaveBeenCalledTimes(1);
    expect(repository.createMany).toHaveBeenCalledWith(events);
  });
});
