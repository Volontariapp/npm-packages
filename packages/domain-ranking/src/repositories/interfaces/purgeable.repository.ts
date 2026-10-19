import type { TransactionManager } from '../sql.js';

/** A repository whose rows belong to a user and are removed with the account. */
export interface IPurgeableRepository {
  /** Removes the rows of the user, inside the given transaction when there is one. */
  purgeByUser(userId: string, manager?: TransactionManager): Promise<number>;
}

/** Rows removed per table by the purge of an account. */
export type PurgeReport = Record<string, number>;
