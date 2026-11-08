import type { TransactionManager } from '../sql.js';
import type { Queryable } from '../sql.js';

export interface StoredLocation {
  /** Ciphertext produced by `encryptLocation`. */
  encrypted: Buffer;
  updatedAt: Date;
}

export interface StoredUserLocation extends StoredLocation {
  userId: string;
}

export interface IRankingLocationRepository {
  save(userId: string, encrypted: Buffer, executor?: Queryable): Promise<void>;
  findByUser(userId: string, executor?: Queryable): Promise<StoredLocation | null>;
  /** Most recent first, at most `limit` rows. */
  findUpdatedSince(since: Date, limit: number, executor?: Queryable): Promise<StoredUserLocation[]>;
  purgeByUser(userId: string, manager?: TransactionManager): Promise<number>;
}
