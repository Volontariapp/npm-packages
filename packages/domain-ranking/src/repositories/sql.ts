import type { BaseRepository } from '@volontariapp/database';

/**
 * The manager of a transaction, as BaseRepository hands it out. Derived from its signature so
 * that the types stay those of the typeorm copy used by @volontariapp/database (a second copy
 * installed next to this package would make the classes incompatible).
 */
export type TransactionManager = Parameters<
  Parameters<BaseRepository<Record<string, unknown>, object>['executeInTransaction']>[0]
>[0]['manager'];

/** Anything that can run SQL: the manager of the repository or the one of a transaction. */
export type Queryable = Pick<TransactionManager, 'query'>;

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

export const countMap = (rows: ReadonlyArray<{ id: string; total: string }>): Map<string, number> =>
  new Map(rows.map((row) => [row.id, Number(row.total)]));
