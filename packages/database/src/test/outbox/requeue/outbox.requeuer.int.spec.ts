import { describe, it, expect, beforeAll, beforeEach, afterAll, afterEach, jest } from '@jest/globals';
import pg from 'pg';
import { testDataSource, setupIntegrationTest } from '../../utils/index.js';
import { OutboxModel } from '../../../outbox/models/outbox.model.js';
import { OutboxStatus } from '../../../outbox/types/outbox.status.js';
import {
  OutboxRequeuer,
  RequeueOptionsError,
  type RequeueOptions,
  type RequeueQueryable,
} from '../../../outbox/requeue/outbox.requeuer.js';
import { makeLoggerMock, type LoggerMock } from '../../utils/helpers/logger-mock.helper.js';
import {
  seedAgedOutboxRow,
  statusOf,
  uuidFor,
} from '../../utils/factories/outbox-aged-row.factory.js';

const DAY = 86_400;

describe('OutboxRequeuer (Integration)', () => {
  let client: pg.Client;
  let loggerMock: LoggerMock;

  setupIntegrationTest([OutboxModel]);

  beforeAll(async () => {
    client = new pg.Client({
      host: '127.0.0.1',
      port: 5433,
      user: 'testuser',
      password: 'testpassword',
      database: 'volontariapp_test',
    });
    await client.connect();
  });

  afterAll(async () => {
    await client.end();
  });

  beforeEach(() => {
    loggerMock = makeLoggerMock();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  const options = (overrides: Partial<RequeueOptions> = {}): RequeueOptions => ({
    table: 'outbox',
    statuses: [OutboxStatus.PROCESSING, OutboxStatus.FAILED],
    createdBefore: new Date(Date.now() - 60_000),
    types: ['post.liked'],
    apply: false,
    operator: 'victor',
    ...overrides,
  });

  const seedIncident = async (): Promise<{ target: string[]; kept: string[] }> => {
    const old = { createdAgoSeconds: 3 * DAY, updatedAgoSeconds: 3 * DAY };
    const target = [
      await seedAgedOutboxRow(testDataSource, {
        id: uuidFor(1),
        status: OutboxStatus.PROCESSING,
        type: 'post.liked',
        ...old,
      }),
      await seedAgedOutboxRow(testDataSource, {
        id: uuidFor(2),
        status: OutboxStatus.FAILED,
        attempts: 5,
        type: 'post.liked',
        ...old,
      }),
    ];
    const kept = [
      await seedAgedOutboxRow(testDataSource, {
        id: uuidFor(3),
        status: OutboxStatus.PROCESSING,
        type: 'user.created',
        ...old,
      }),
      await seedAgedOutboxRow(testDataSource, {
        id: uuidFor(4),
        status: OutboxStatus.COMPLETED,
        type: 'post.liked',
        ...old,
      }),
      await seedAgedOutboxRow(testDataSource, {
        id: uuidFor(5),
        status: OutboxStatus.PROCESSING,
        type: 'post.liked',
        createdAgoSeconds: 5,
        updatedAgoSeconds: 5,
      }),
    ];
    return { target, kept };
  };

  it('without --apply lists the matching ids and writes nothing', async () => {
    const { target } = await seedIncident();
    const querySpy = jest.spyOn(client, 'query');

    const report = await new OutboxRequeuer(loggerMock, client).run(options());

    expect(report.applied).toBe(false);
    expect(report.matchedIds).toEqual(target);
    expect(report.requeued).toBe(0);
    expect(querySpy).toHaveBeenCalledTimes(1);
    expect(querySpy.mock.calls[0][0]).toMatch(/^\s*SELECT/);
    expect(await statusOf(testDataSource, target[0])).toBe(OutboxStatus.PROCESSING);
    expect(await statusOf(testDataSource, target[1])).toBe(OutboxStatus.FAILED);
    expect(loggerMock.warn).not.toHaveBeenCalled();
  });

  it('with --apply puts only the matching rows back to PENDING, attempts unchanged', async () => {
    const { target, kept } = await seedIncident();

    const report = await new OutboxRequeuer(loggerMock, client).run(
      options({ apply: true, reason: 'replay 2026-11-07 incident' }),
    );

    expect(report.requeued).toBe(2);
    for (const id of target) {
      expect(await statusOf(testDataSource, id)).toBe(OutboxStatus.PENDING);
    }
    expect(await statusOf(testDataSource, kept[0])).toBe(OutboxStatus.PROCESSING);
    expect(await statusOf(testDataSource, kept[1])).toBe(OutboxStatus.COMPLETED);
    expect(await statusOf(testDataSource, kept[2])).toBe(OutboxStatus.PROCESSING);
    const failed = await testDataSource.getRepository(OutboxModel).findOneByOrFail({ id: target[1] });
    expect(failed.attempts).toBe(5);
  });

  it('logs one warn per batch with the ids, the reason and the operator', async () => {
    for (let i = 0; i < 5; i += 1) {
      await seedAgedOutboxRow(testDataSource, {
        id: uuidFor(10 + i),
        status: OutboxStatus.FAILED,
        type: 'post.liked',
        createdAgoSeconds: 3 * DAY,
        updatedAgoSeconds: 3 * DAY,
      });
    }

    await new OutboxRequeuer(loggerMock, client).run(
      options({ apply: true, reason: 'replay', operator: 'agent', batchSize: 2 }),
    );

    expect(loggerMock.warn).toHaveBeenCalledTimes(3);
    expect(loggerMock.warn).toHaveBeenNthCalledWith(
      1,
      expect.any(String),
      expect.objectContaining({
        table: 'outbox',
        count: 2,
        ids: [uuidFor(10), uuidFor(11)],
        reason: 'replay',
        operator: 'agent',
      }),
    );
  });

  it('refuses --apply without a reason, and writes nothing', async () => {
    const { target } = await seedIncident();

    await expect(
      new OutboxRequeuer(loggerMock, client).run(options({ apply: true })),
    ).rejects.toThrow(RequeueOptionsError);
    expect(await statusOf(testDataSource, target[0])).toBe(OutboxStatus.PROCESSING);
  });

  it('refuses no type, a COMPLETED status and a table that is not a plain identifier', async () => {
    const requeuer = new OutboxRequeuer(loggerMock, client);

    await expect(requeuer.run(options({ types: [] }))).rejects.toThrow(/type/);
    await expect(requeuer.run(options({ statuses: [OutboxStatus.COMPLETED] }))).rejects.toThrow(
      /can be requeued/,
    );
    await expect(requeuer.run(options({ table: 'outbox; DROP TABLE outbox' }))).rejects.toThrow(
      /identifier/,
    );
  });

  it('does not touch a row that was claimed between the listing and the batch', async () => {
    const { target } = await seedIncident();
    let listed = false;
    const racing: RequeueQueryable = {
      query: async (text, values) => {
        const result = await client.query(text, values);
        if (!listed) {
          listed = true;
          await testDataSource.query(`UPDATE "outbox" SET "status" = 'COMPLETED' WHERE "id" = $1`, [
            target[0],
          ]);
        }
        return result;
      },
    };

    const report = await new OutboxRequeuer(loggerMock, racing).run(
      options({ apply: true, reason: 'race' }),
    );

    expect(report.matchedIds).toHaveLength(2);
    expect(report.requeued).toBe(1);
    expect(await statusOf(testDataSource, target[0])).toBe(OutboxStatus.COMPLETED);
  });
});
