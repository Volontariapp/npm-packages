import { describe, it, expect, beforeAll, beforeEach, afterEach, jest } from '@jest/globals';
import type { QueryRunner } from 'typeorm';
import { testDataSource, setupIntegrationTest } from '../../utils/index.js';
import { OutboxModel } from '../../../outbox/models/outbox.model.js';
import { OutboxStatus } from '../../../outbox/types/outbox.status.js';
import { OutboxReaper } from '../../../outbox/reapers/outbox.reaper.js';
import { TestOutboxRepository } from '../../utils/repositories/outbox-test.repository.js';
import { makeLoggerMock, type LoggerMock } from '../../utils/helpers/logger-mock.helper.js';
import {
  seedAgedOutboxRow,
  statusOf,
  uuidFor,
} from '../../utils/factories/outbox-aged-row.factory.js';

const MINUTE = 60;

/** The prototype shared by every query runner of the postgres driver, to count the statements. */
const queryRunnerPrototype = (): QueryRunner =>
  Object.getPrototypeOf(testDataSource.createQueryRunner()) as QueryRunner;

describe('OutboxReaper (Integration)', () => {
  let repository: TestOutboxRepository;
  let loggerMock: LoggerMock;

  setupIntegrationTest([OutboxModel]);

  beforeAll(() => {
    repository = new TestOutboxRepository(testDataSource.getRepository(OutboxModel));
  });

  beforeEach(() => {
    loggerMock = makeLoggerMock();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  const buildReaper = (limit = 500): OutboxReaper =>
    new OutboxReaper(loggerMock, repository, {
      stuckAfterMs: 5 * MINUTE * 1000,
      maxAttempts: 5,
      retryBaseMs: 30_000,
      limit,
      maxAgeMs: 15 * MINUTE * 1000,
    });

  it('puts a PROCESSING row stuck for 10 minutes back to PENDING', async () => {
    const id = await seedAgedOutboxRow(testDataSource, {
      id: uuidFor(1),
      status: OutboxStatus.PROCESSING,
      updatedAgoSeconds: 10 * MINUTE,
      createdAgoSeconds: 11 * MINUTE,
    });

    const report = await buildReaper().reap();

    expect(report).toEqual({ stuck: 1, failed: 0 });
    expect(await statusOf(testDataSource, id)).toBe(OutboxStatus.PENDING);
    const row = await testDataSource.getRepository(OutboxModel).findOneByOrFail({ id });
    expect(row.attempts).toBe(0);
  });

  it('keeps a PROCESSING row of 1 minute: it is probably still being sent', async () => {
    const id = await seedAgedOutboxRow(testDataSource, {
      id: uuidFor(2),
      status: OutboxStatus.PROCESSING,
      updatedAgoSeconds: MINUTE,
      createdAgoSeconds: 2 * MINUTE,
    });

    expect(await buildReaper().reap()).toEqual({ stuck: 0, failed: 0 });
    expect(await statusOf(testDataSource, id)).toBe(OutboxStatus.PROCESSING);
  });

  it('retries a FAILED row with attempts = 1 after its delay, but not before', async () => {
    // delay = 30 s * 2^1 = 60 s
    const late = await seedAgedOutboxRow(testDataSource, {
      id: uuidFor(3),
      status: OutboxStatus.FAILED,
      attempts: 1,
      updatedAgoSeconds: 2 * MINUTE,
      createdAgoSeconds: 3 * MINUTE,
    });
    const tooSoon = await seedAgedOutboxRow(testDataSource, {
      id: uuidFor(4),
      status: OutboxStatus.FAILED,
      attempts: 1,
      updatedAgoSeconds: 10,
      createdAgoSeconds: 3 * MINUTE,
    });

    expect(await buildReaper().reap()).toEqual({ stuck: 0, failed: 1 });
    expect(await statusOf(testDataSource, late)).toBe(OutboxStatus.PENDING);
    expect(await statusOf(testDataSource, tooSoon)).toBe(OutboxStatus.FAILED);
  });

  it('never retries a FAILED row that reached maxAttempts', async () => {
    const id = await seedAgedOutboxRow(testDataSource, {
      id: uuidFor(5),
      status: OutboxStatus.FAILED,
      attempts: 5,
      updatedAgoSeconds: 60 * MINUTE,
      createdAgoSeconds: 61 * MINUTE,
    });

    expect(await buildReaper().reap()).toEqual({ stuck: 0, failed: 0 });
    expect(await statusOf(testDataSource, id)).toBe(OutboxStatus.FAILED);
  });

  it('does not reap a PROCESSING row older than reapMaxAgeMs: only the requeue command does', async () => {
    const id = await seedAgedOutboxRow(testDataSource, {
      id: uuidFor(6),
      status: OutboxStatus.PROCESSING,
      updatedAgoSeconds: 3 * 24 * 60 * MINUTE,
      createdAgoSeconds: 3 * 24 * 60 * MINUTE,
    });

    expect(await buildReaper().reap()).toEqual({ stuck: 0, failed: 0 });
    expect(await statusOf(testDataSource, id)).toBe(OutboxStatus.PROCESSING);
  });

  it('leaves PENDING and COMPLETED rows alone', async () => {
    const pending = await seedAgedOutboxRow(testDataSource, {
      id: uuidFor(7),
      status: OutboxStatus.PENDING,
      updatedAgoSeconds: 10 * MINUTE,
    });
    const completed = await seedAgedOutboxRow(testDataSource, {
      id: uuidFor(8),
      status: OutboxStatus.COMPLETED,
      updatedAgoSeconds: 10 * MINUTE,
    });

    expect(await buildReaper().reap()).toEqual({ stuck: 0, failed: 0 });
    expect(await statusOf(testDataSource, pending)).toBe(OutboxStatus.PENDING);
    expect(await statusOf(testDataSource, completed)).toBe(OutboxStatus.COMPLETED);
  });

  it('logs one warn per pass with the ids and the counts', async () => {
    const id = await seedAgedOutboxRow(testDataSource, {
      id: uuidFor(9),
      status: OutboxStatus.PROCESSING,
      updatedAgoSeconds: 10 * MINUTE,
    });
    const warnSpy = jest.spyOn(loggerMock, 'warn');

    await buildReaper().reap();

    expect(warnSpy).toHaveBeenCalledTimes(1);
    expect(warnSpy).toHaveBeenCalledWith(
      expect.stringContaining('PENDING'),
      expect.objectContaining({ table: 'outbox', stuck: 1, failed: 0, ids: [id] }),
    );
  });

  it('runs one UPDATE per pass (three statements with BEGIN and COMMIT), also when nothing is stuck', async () => {
    const querySpy = jest.spyOn(queryRunnerPrototype(), 'query');
    await seedAgedOutboxRow(testDataSource, {
      id: uuidFor(10),
      status: OutboxStatus.PROCESSING,
      updatedAgoSeconds: 10 * MINUTE,
    });
    querySpy.mockClear();

    await buildReaper().reap();
    const withRows = querySpy.mock.calls.map(([sql]) => sql.trim().split(/\s/)[0]);
    querySpy.mockClear();
    await buildReaper().reap();
    const withoutRows = querySpy.mock.calls.map(([sql]) => sql.trim().split(/\s/)[0]);

    expect(withRows).toEqual(['START', 'WITH', 'COMMIT']);
    expect(withoutRows).toEqual(['START', 'WITH', 'COMMIT']);
  });

  it('keeps going, limit rows at a time, until nothing is left (oldest first)', async () => {
    const ids: string[] = [];
    for (let i = 0; i < 5; i += 1) {
      ids.push(
        await seedAgedOutboxRow(testDataSource, {
          id: uuidFor(20 + i),
          status: OutboxStatus.PROCESSING,
          updatedAgoSeconds: 10 * MINUTE,
          createdAgoSeconds: (14 - i) * MINUTE,
        }),
      );
    }
    const querySpy = jest.spyOn(queryRunnerPrototype(), 'query');

    const report = await buildReaper(2).reap();

    // 5 rows, 2 per statement: 3 statements (2 + 2 + 1)
    expect(report.stuck).toBe(5);
    const updates = querySpy.mock.calls.filter(([sql]) => sql.trim().startsWith('WITH'));
    expect(updates).toHaveLength(3);
    for (const id of ids) {
      expect(await statusOf(testDataSource, id)).toBe(OutboxStatus.PENDING);
    }
  });

  it('two reapers running at once never take the same row twice', async () => {
    for (let i = 0; i < 6; i += 1) {
      await seedAgedOutboxRow(testDataSource, {
        id: uuidFor(40 + i),
        status: OutboxStatus.PROCESSING,
        updatedAgoSeconds: 10 * MINUTE,
      });
    }

    const [a, b] = await Promise.all([buildReaper().reap(), buildReaper().reap()]);

    expect(a.stuck + b.stuck).toBe(6);
  });

  it('refuses a limit that is not positive and a table that is not a plain identifier', () => {
    expect(() => buildReaper(0)).toThrow();
    const store = {
      metadata: { tableName: 'outbox; DROP TABLE x' },
      executeInTransaction: repository.executeInTransaction.bind(repository),
    };
    expect(
      () =>
        new OutboxReaper(loggerMock, store, {
          stuckAfterMs: 1,
          maxAttempts: 1,
          retryBaseMs: 1,
          limit: 1,
          maxAgeMs: 1,
        }),
    ).toThrow(/identifier/i);
  });
});
