import { testDataSource } from '../data-source.js';

type OutboxTable = 'event_queue' | 'jobs_outbox';

/**
 * Makes every insert into the given outbox table fail inside the database, so a test can prove
 * that the `UPDATE` of a transition is rolled back with it. Returns the function that removes
 * the failure.
 */
export const mockOutboxInsertFailure = async (table: OutboxTable): Promise<() => Promise<void>> => {
  await testDataSource.query(
    `CREATE OR REPLACE FUNCTION fail_outbox_insert() RETURNS trigger AS $$
     BEGIN RAISE EXCEPTION 'simulated outbox failure'; END;
     $$ LANGUAGE plpgsql`,
  );
  await testDataSource.query(
    `CREATE TRIGGER fail_outbox_insert BEFORE INSERT ON ${table}
     FOR EACH ROW EXECUTE FUNCTION fail_outbox_insert()`,
  );

  return async () => {
    await testDataSource.query(`DROP TRIGGER IF EXISTS fail_outbox_insert ON ${table}`);
    await testDataSource.query(`DROP FUNCTION IF EXISTS fail_outbox_insert()`);
  };
};
