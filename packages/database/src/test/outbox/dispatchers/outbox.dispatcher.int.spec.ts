import { describe, it, expect, beforeAll } from '@jest/globals';
import { testDataSource, setupIntegrationTest } from '../../utils/index.js';
import { OutboxModel } from '../../../outbox/models/outbox.model.js';
import { OutboxDispatcher } from '../../../outbox/dispatchers/outbox.dispatcher.js';
import { OutboxStatus } from '../../../outbox/types/outbox.status.js';
import type { OutboxEntity } from '../../../outbox/entities/outbox.entity.js';
import { TestOutboxRepository } from '../../utils/repositories/outbox-test.repository.js';
import { makeLoggerMock } from '../../utils/helpers/logger-mock.helper.js';

describe('OutboxDispatcher (Integration)', () => {
  let dispatcher: OutboxDispatcher<OutboxModel, OutboxEntity>;
  let repository: TestOutboxRepository;
  const loggerMock = makeLoggerMock();

  setupIntegrationTest([OutboxModel]);

  beforeAll(() => {
    repository = new TestOutboxRepository(testDataSource.getRepository(OutboxModel));
    dispatcher = new OutboxDispatcher(loggerMock, repository);
  });

  it('markAsProcessing() should update status in database', async () => {
    const repo = testDataSource.getRepository(OutboxModel);
    const model = new OutboxModel();
    model.id = '00000000-0000-0000-0000-000000000001';
    model.type = 'test';
    model.emitter = 'test';
    model.emitterId = '00000000-0000-0000-0000-000000000000';
    model.status = OutboxStatus.PENDING;
    model.updatedAt = new Date();
    await repo.save(model);

    const entity = await repository.findOneOrFail({ id: model.id });
    await dispatcher.markAsProcessing(entity);

    const updated = await repo.findOneBy({ id: model.id });
    expect(updated?.status).toBe(OutboxStatus.PROCESSING);
  });

  it('markAsFailed() should update status and lastError in database', async () => {
    const repo = testDataSource.getRepository(OutboxModel);
    const model = new OutboxModel();
    model.id = '00000000-0000-0000-0000-000000000002';
    model.type = 'test';
    model.emitter = 'test';
    model.emitterId = '00000000-0000-0000-0000-000000000000';
    model.status = OutboxStatus.PROCESSING;
    model.updatedAt = new Date();
    await repo.save(model);

    const entity = await repository.findOneOrFail({ id: model.id });
    const error = 'Failure reason';
    await dispatcher.markAsFailed(entity, error);

    const updated = await repo.findOneBy({ id: model.id });
    expect(updated?.status).toBe(OutboxStatus.FAILED);
    expect(updated?.lastError).toBe(error);
    expect(updated?.attempts).toBe(1);
  });

  it('markAsCompleted() should update status to COMPLETED in database', async () => {
    const repo = testDataSource.getRepository(OutboxModel);
    const model = new OutboxModel();
    model.id = '00000000-0000-0000-0000-000000000003';
    model.type = 'test';
    model.emitter = 'test';
    model.emitterId = '00000000-0000-0000-0000-000000000000';
    model.status = OutboxStatus.PROCESSING;
    model.updatedAt = new Date();
    await repo.save(model);

    const entity = await repository.findOneOrFail({ id: model.id });
    await dispatcher.markAsCompleted(entity);

    const updated = await repo.findOneBy({ id: model.id });
    expect(updated?.status).toBe(OutboxStatus.COMPLETED);
  });
});
