import type { DataSource } from 'typeorm';
import type { Queryable } from './sql.js';
import { rowsOf } from './sql.js';

export interface StoredLocation {
  /** Ciphertext produced by `encryptLocation`. */
  encrypted: Buffer;
  updatedAt: Date;
}

/** Storage of the encrypted position. The encryption itself lives in the pure services. */
export class RankingLocationRepository {
  constructor(private readonly dataSource: DataSource) {}

  async save(
    userId: string,
    encrypted: Buffer,
    executor: Queryable = this.dataSource.manager,
  ): Promise<void> {
    await executor.query(
      `INSERT INTO ranking_user_location (user_id, location_enc, updated_at)
       VALUES ($1::uuid, $2::bytea, now())
       ON CONFLICT (user_id) DO UPDATE SET location_enc = EXCLUDED.location_enc, updated_at = now()`,
      [userId, encrypted],
    );
  }

  async find(userId: string, executor: Queryable = this.dataSource.manager): Promise<StoredLocation | null> {
    const rows = rowsOf<{ location_enc: Buffer; updated_at: Date }>(
      await executor.query(
        `SELECT location_enc, updated_at FROM ranking_user_location WHERE user_id = $1::uuid`,
        [userId],
      ),
    );
    const row = rows.at(0);
    return row ? { encrypted: row.location_enc, updatedAt: row.updated_at } : null;
  }
}
