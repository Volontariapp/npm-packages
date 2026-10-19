import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import type { Repository } from '@volontariapp/database';
import { BaseRepository } from '@volontariapp/database';
import type { TransactionManager } from './sql.js';
import { RankingEventWishEntity } from '../entities/index.js';
import { RankingEventWishModel } from '../models/index.js';
import type { IRankingEventWishRepository } from './interfaces/index.js';
import type { Queryable } from './sql.js';
import { countMap, rowsOf, uniqueUuids } from './sql.js';

/** Active wishes. A count of rows stays idempotent when a stream message is replayed. */
@Injectable()
export class PostgresRankingEventWishRepository
  extends BaseRepository<RankingEventWishModel, RankingEventWishEntity>
  implements IRankingEventWishRepository
{
  constructor(
    @InjectRepository(RankingEventWishModel)
    repository: Repository<RankingEventWishModel>,
  ) {
    super(repository, RankingEventWishEntity, RankingEventWishModel);
  }

  async add(
    userId: string,
    eventId: string,
    executor: Queryable = this.repository.manager,
  ): Promise<void> {
    await executor.query(
      `INSERT INTO ranking_event_wish (user_id, event_id) VALUES ($1::uuid, $2::uuid)
       ON CONFLICT (user_id, event_id) DO NOTHING`,
      [userId, eventId],
    );
  }

  async removeWish(
    userId: string,
    eventId: string,
    executor: Queryable = this.repository.manager,
  ): Promise<void> {
    await executor.query(
      `DELETE FROM ranking_event_wish WHERE user_id = $1::uuid AND event_id = $2::uuid`,
      [userId, eventId],
    );
  }

  async countByEvents(
    eventIds: readonly string[],
    executor: Queryable = this.repository.manager,
  ): Promise<Map<string, number>> {
    const ids = uniqueUuids(eventIds);
    if (ids.length === 0) return new Map();
    return countMap(
      rowsOf<{ id: string; total: string }>(
        await executor.query(
          `SELECT event_id AS id, count(*) AS total FROM ranking_event_wish
           WHERE event_id = ANY($1::uuid[]) GROUP BY event_id`,
          [ids],
        ),
      ),
    );
  }

  async purgeByUser(
    userId: string,
    manager: TransactionManager = this.repository.manager,
  ): Promise<number> {
    const result = await manager.delete(RankingEventWishModel, { userId });
    return result.affected ?? 0;
  }
}
