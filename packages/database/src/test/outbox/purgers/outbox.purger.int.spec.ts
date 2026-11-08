import { describe, it, expect, beforeAll, beforeEach } from '@jest/globals';
import { InvalidOutboxSizeError } from '@volontariapp/errors';
import { testDataSource, setupIntegrationTest } from '../../utils/index.js';
import { OutboxModel } from '../../../outbox/models/outbox.model.js';
import { OutboxPurger } from '../../../outbox/purgers/outbox.purger.js';
import { OutboxStatus } from '../../../outbox/types/outbox.status.js';
import { makeOutboxEvent } from '../../utils/helpers/outbox-event.helper.js';
import { TestOutboxRepository } from '../../utils/repositories/outbox-test.repository.js';
import { makeLoggerMock, type LoggerMock } from '../../utils/helpers/logger-mock.helper.js';
import { ExtendedOutboxModel } from '../../example/models/extended-outbox.model.js';

const DAY_MS = 86_400_000;

const daysAgo = (days: number): Date => new Date(Date.now() - days * DAY_MS);

describe('OutboxPurger (Integration)', () => {
  let repository: TestOutboxRepository;
  let loggerMock: LoggerMock;
  let nextId = 1;

  setupIntegrationTest([OutboxModel, ExtendedOutboxModel]);

  beforeAll(() => {
    loggerMock = makeLoggerMock();
    repository = new TestOutboxRepository(testDataSource.getRepository(OutboxModel));
  });

  beforeEach(() => {
    nextId = 1;
  });

  const nextUuid = (): string =>
    `00000000-0000-0000-0000-${(nextId++).toString().padStart(12, '0')}`;

  const seed = async (
    status: OutboxStatus,
    createdAt: Date,
    count = 1,
    model: typeof OutboxModel | typeof ExtendedOutboxModel = OutboxModel,
  ): Promise<string[]> => {
    const ids = Array.from({ length: count }, () => nextUuid());
    const rows = ids.map((id) =>
      makeOutboxEvent({ id, status, createdAt }, () => new model() as OutboxModel),
    );
    await testDataSource.getRepository(model).save(rows);
    return ids;
  };

  const remainingIds = async (model: typeof OutboxModel = OutboxModel): Promise<string[]> => {
    const rows = await testDataSource.getRepository(model).find({ order: { id: 'ASC' } });
    return rows.map((row) => row.id);
  };

  const buildPurger = (
    options: Partial<{ retentionMs: number; batchSize: number; additionalTables: string[] }> = {},
  ): OutboxPurger =>
    new OutboxPurger(loggerMock, repository, {
      retentionMs: DAY_MS,
      batchSize: 1000,
      ...options,
    });

  it('deletes only COMPLETED rows older than the retention', async () => {
    const oldCompleted = await seed(OutboxStatus.COMPLETED, daysAgo(2), 3);
    const recentCompleted = await seed(OutboxStatus.COMPLETED, new Date());
    const oldPending = await seed(OutboxStatus.PENDING, daysAgo(2));
    const oldProcessing = await seed(OutboxStatus.PROCESSING, daysAgo(2));
    const oldFailed = await seed(OutboxStatus.FAILED, daysAgo(2));

    const report = await buildPurger().purgeCompleted();

    expect(report).toEqual({ outbox: 3 });
    const kept = await remainingIds();
    expect(kept).toEqual(
      [...recentCompleted, ...oldPending, ...oldProcessing, ...oldFailed].sort(),
    );
    expect(kept).not.toEqual(expect.arrayContaining(oldCompleted));
  });

  it('keeps going batch after batch until nothing eligible is left', async () => {
    await seed(OutboxStatus.COMPLETED, daysAgo(3), 5);
    const pending = await seed(OutboxStatus.PENDING, daysAgo(3), 2);

    const report = await buildPurger({ batchSize: 2 }).purgeCompleted();

    expect(report).toEqual({ outbox: 5 });
    expect(await remainingIds()).toEqual(pending);
  });

  it('does nothing the second time it runs', async () => {
    await seed(OutboxStatus.COMPLETED, daysAgo(2), 2);
    const purger = buildPurger();

    await purger.purgeCompleted();
    const second = await purger.purgeCompleted();

    expect(second).toEqual({ outbox: 0 });
  });

  it('applies the same rule to the additional tables', async () => {
    const extendedTable = testDataSource.getMetadata(ExtendedOutboxModel).tableName;
    await seed(OutboxStatus.COMPLETED, daysAgo(2), 2, ExtendedOutboxModel);
    const recentExtended = await seed(OutboxStatus.COMPLETED, new Date(), 1, ExtendedOutboxModel);
    await seed(OutboxStatus.COMPLETED, daysAgo(2), 1);

    const report = await buildPurger({ additionalTables: [extendedTable] }).purgeCompleted();

    expect(report).toEqual({ outbox: 1, [extendedTable]: 2 });
    expect(await remainingIds(ExtendedOutboxModel as typeof OutboxModel)).toEqual(recentExtended);
  });

  it('refuses a batch size that is not positive', () => {
    expect(() => buildPurger({ batchSize: 0 })).toThrow(InvalidOutboxSizeError);
  });

  it('refuses a table name that is not a plain identifier', () => {
    expect(() => buildPurger({ additionalTables: ['job_audit; DROP TABLE outbox'] })).toThrow(
      /identifier/i,
    );
  });
});
