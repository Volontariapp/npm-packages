import { describe, it, expect } from '@jest/globals';
import { testDataSource, setupIntegrationTest } from '../../utils/index.js';
import { EventQueueModel } from '../../../outbox/models/event-queue.model.js';
import { JobsOutboxModel } from '../../../outbox/models/jobs-outbox.model.js';

interface PlanRow {
  'QUERY PLAN': string;
}

const claimPlan = async (table: string): Promise<string> => {
  const rows: PlanRow[] = await testDataSource.query(
    `EXPLAIN SELECT "id" FROM "${table}" WHERE "status" = 'PENDING' ORDER BY "created_at" ASC, "id" ASC LIMIT 100`,
  );
  return rows.map((row) => row['QUERY PLAN']).join('\n');
};

describe('Outbox polling index (Integration)', () => {
  setupIntegrationTest([EventQueueModel, JobsOutboxModel]);

  it('serves the polling query of event_queue from an index instead of reading the table', async () => {
    await testDataSource.query(`
      INSERT INTO "event_queue" ("id", "type", "emitter", "emitterId", "status", "version", "payload", "created_at")
      SELECT gen_random_uuid(), 'user.created', 'index-test', gen_random_uuid(),
             CASE WHEN n <= 10 THEN 'PENDING' ELSE 'COMPLETED' END,
             1, '{"after":{}}'::jsonb, NOW() - (n * INTERVAL '1 second')
      FROM generate_series(1, 20000) AS n`);
    await testDataSource.query(`ANALYZE "event_queue"`);

    const plan = await claimPlan('event_queue');

    expect(plan).toMatch(/Index/);
    expect(plan).not.toMatch(/Seq Scan/);
  });

  it('serves the polling query of jobs_outbox from an index instead of reading the table', async () => {
    await testDataSource.query(`
      INSERT INTO "jobs_outbox" ("id", "type", "emitter", "emitterId", "status", "target", "payload", "scheduled_at", "created_at")
      SELECT gen_random_uuid(), 'user.created', 'index-test', gen_random_uuid(),
             CASE WHEN n <= 10 THEN 'PENDING' ELSE 'COMPLETED' END,
             'worker-test', '{}'::jsonb, NOW(), NOW() - (n * INTERVAL '1 second')
      FROM generate_series(1, 20000) AS n`);
    await testDataSource.query(`ANALYZE "jobs_outbox"`);

    const plan = await claimPlan('jobs_outbox');

    expect(plan).toMatch(/Index/);
    expect(plan).not.toMatch(/Seq Scan/);
  });
});
