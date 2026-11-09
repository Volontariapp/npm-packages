import 'reflect-metadata';
import { DataSource } from 'typeorm';
import { EventModel } from '../../models/event.model.js';
import { TagModel } from '../../models/tag.model.js';
import { RequirementModel } from '../../models/requirement.model.js';

/**
 * Postgres DataSource that builds entity metadata without opening a connection, so the SQL a
 * QueryBuilder produces can be read with `getQueryAndParameters()` in a unit test.
 */
class SqlOnlyDataSource extends DataSource {
  async loadMetadata(): Promise<void> {
    await this.buildMetadatas();
  }
}

export const createSqlOnlyDataSource = async (): Promise<DataSource> => {
  const dataSource = new SqlOnlyDataSource({
    type: 'postgres',
    entities: [EventModel, TagModel, RequirementModel],
  });
  await dataSource.loadMetadata();
  return dataSource;
};
