import type { DataSource, EntityManager } from 'typeorm';

/** Anything that can run SQL: the data source or the manager of a transaction. */
export type Queryable = Pick<EntityManager, 'query'>;

export type Transactional = DataSource | EntityManager;

/**
 * TypeORM returns the rows of a SELECT or INSERT, but `[rows, affectedCount]` for an UPDATE or
 * a DELETE with a RETURNING clause. This hides the difference.
 */
export const rowsOf = <T>(raw: unknown): T[] => {
  if (Array.isArray(raw) && raw.length === 2 && Array.isArray(raw[0]) && typeof raw[1] === 'number') {
    return raw[0] as T[];
  }
  return raw as T[];
};

export const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export const uniqueUuids = (ids: readonly string[]): string[] => [
  ...new Set(ids.filter((id) => UUID_PATTERN.test(id))),
];
