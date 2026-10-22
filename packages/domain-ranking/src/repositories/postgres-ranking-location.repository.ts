import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import type { Repository } from '@volontariapp/database';
import { BaseRepository } from '@volontariapp/database';
import type { TransactionManager } from './sql.js';
import { RankingUserLocationEntity } from '../entities/index.js';
import { RankingUserLocationModel } from '../models/index.js';
import type { IRankingLocationRepository, StoredLocation } from './interfaces/index.js';
import type { Queryable } from './sql.js';
import { rowsOf } from './sql.js';

/** Storage of the encrypted position. The encryption itself lives in the pure services. */
@Injectable()
export class PostgresRankingLocationRepository
  extends BaseRepository<RankingUserLocationModel, RankingUserLocationEntity>
  implements IRankingLocationRepository
{
  constructor(
    @InjectRepository(RankingUserLocationModel)
    repository: Repository<RankingUserLocationModel>,
  ) {
    super(repository, RankingUserLocationEntity, RankingUserLocationModel);
  }

  async save(
    userId: string,
    encrypted: Buffer,
    executor: Queryable = this.repository.manager,
  ): Promise<void> {
    await executor.query(
      `INSERT INTO ranking_user_location (user_id, location_enc, updated_at)
       VALUES ($1::uuid, $2::bytea, now())
       ON CONFLICT (user_id) DO UPDATE SET location_enc = EXCLUDED.location_enc, updated_at = now()`,
      [userId, encrypted],
    );
  }

  async findByUser(
    userId: string,
    executor: Queryable = this.repository.manager,
  ): Promise<StoredLocation | null> {
    const rows = rowsOf<{ location_enc: Buffer; updated_at: Date }>(
      await executor.query(
        `SELECT location_enc, updated_at FROM ranking_user_location WHERE user_id = $1::uuid`,
        [userId],
      ),
    );
    const row = rows.at(0);
    return row ? { encrypted: row.location_enc, updatedAt: row.updated_at } : null;
  }

  async purgeByUser(
    userId: string,
    manager: TransactionManager = this.repository.manager,
  ): Promise<number> {
    const result = await manager.delete(RankingUserLocationModel, { userId });
    return result.affected ?? 0;
  }
}
