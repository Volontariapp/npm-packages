import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import type { Repository } from '@volontariapp/database';
import { BaseRepository } from '@volontariapp/database';
import type { TransactionManager } from './sql.js';
import { RankingEventMentionEntity } from '../entities/index.js';
import { RankingEventMentionModel } from '../models/index.js';
import type { IRankingEventMentionRepository } from './interfaces/index.js';
import type { Queryable } from './sql.js';
import { countMap, rowsOf, uniqueUuids } from './sql.js';

/** Posts linked to an event: the popularity counts the distinct authors, not the posts. */
@Injectable()
export class PostgresRankingEventMentionRepository
  extends BaseRepository<RankingEventMentionModel, RankingEventMentionEntity>
  implements IRankingEventMentionRepository
{
  constructor(
    @InjectRepository(RankingEventMentionModel)
    repository: Repository<RankingEventMentionModel>,
  ) {
    super(repository, RankingEventMentionEntity, RankingEventMentionModel);
  }

  async add(
    mention: { postId: string; eventId: string; authorId: string },
    executor: Queryable = this.repository.manager,
  ): Promise<void> {
    await executor.query(
      `INSERT INTO ranking_event_mention (post_id, event_id, author_id)
       VALUES ($1::uuid, $2::uuid, $3::uuid) ON CONFLICT (post_id) DO NOTHING`,
      [mention.postId, mention.eventId, mention.authorId],
    );
  }

  async removeByPost(postId: string, executor: Queryable = this.repository.manager): Promise<void> {
    await executor.query(`DELETE FROM ranking_event_mention WHERE post_id = $1::uuid`, [postId]);
  }

  async countDistinctAuthors(
    eventIds: readonly string[],
    windowDays: number,
    executor: Queryable = this.repository.manager,
  ): Promise<Map<string, number>> {
    const ids = uniqueUuids(eventIds);
    if (ids.length === 0) return new Map();
    return countMap(
      rowsOf<{ id: string; total: string }>(
        await executor.query(
          `SELECT event_id AS id, count(DISTINCT author_id) AS total FROM ranking_event_mention
           WHERE event_id = ANY($1::uuid[]) AND created_at > now() - make_interval(days => $2::integer)
           GROUP BY event_id`,
          [ids, windowDays],
        ),
      ),
    );
  }

  async purgeByUser(
    userId: string,
    manager: TransactionManager = this.repository.manager,
  ): Promise<number> {
    const result = await manager.delete(RankingEventMentionModel, { authorId: userId });
    return result.affected ?? 0;
  }
}
