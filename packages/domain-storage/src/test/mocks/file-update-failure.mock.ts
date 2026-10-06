import { testDataSource } from '../data-source.js';

/**
 * Makes any `UPDATE` touching the given file fail inside the database, so a test can prove that
 * a multi-row `UPDATE` is rolled back as a whole. Returns the function that removes the failure.
 */
export const mockFileUpdateFailure = async (fileId: string): Promise<() => Promise<void>> => {
  await testDataSource.query(
    `CREATE OR REPLACE FUNCTION fail_file_update() RETURNS trigger AS $$
     BEGIN
       IF NEW.id = '${fileId}'::uuid THEN RAISE EXCEPTION 'simulated file update failure'; END IF;
       RETURN NEW;
     END;
     $$ LANGUAGE plpgsql`,
  );
  await testDataSource.query(`DROP TRIGGER IF EXISTS fail_file_update ON files`);
  await testDataSource.query(
    `CREATE TRIGGER fail_file_update BEFORE UPDATE ON files
     FOR EACH ROW EXECUTE FUNCTION fail_file_update()`,
  );

  return async () => {
    await testDataSource.query(`DROP TRIGGER IF EXISTS fail_file_update ON files`);
    await testDataSource.query(`DROP FUNCTION IF EXISTS fail_file_update()`);
  };
};
