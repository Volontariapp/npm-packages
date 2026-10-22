import type { TransactionManager } from '../sql.js';
import type { Queryable } from '../sql.js';

export interface StoredLocation {
  /** Ciphertext produced by `encryptLocation`. */
  encrypted: Buffer;
  updatedAt: Date;
}

export interface IRankingLocationRepository {
  save(userId: string, encrypted: Buffer, executor?: Queryable): Promise<void>;
  findByUser(userId: string, executor?: Queryable): Promise<StoredLocation | null>;
  purgeByUser(userId: string, manager?: TransactionManager): Promise<number>;
}
