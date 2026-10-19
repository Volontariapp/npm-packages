import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import type { Repository } from '@volontariapp/database';
import type { TransactionManager } from './sql.js';
import { RankingScoreEntity } from '../entities/index.js';
import type { RankingListKind } from '../enums/index.js';
import { RankingListKind as ListKinds } from '../enums/index.js';
import { RankingScoreModel } from '../models/index.js';
import type {
  AfterListWrite,
  IRankingScoreRepository,
  ListPage,
  PageParams,
  RankedEventItem,
  ReplaceListParams,
  ReplaceListResult,
} from './interfaces/index.js';
import { PostgresRankedListRepository } from './postgres-ranked-list.repository.js';

/** The event list of a user (table ranking_score). */
@Injectable()
export class PostgresRankingScoreRepository
  extends PostgresRankedListRepository<RankingScoreModel, RankingScoreEntity>
  implements IRankingScoreRepository
{
  protected readonly listKind: RankingListKind = ListKinds.EVENT;

  constructor(
    @InjectRepository(RankingScoreModel)
    repository: Repository<RankingScoreModel>,
  ) {
    super(repository, RankingScoreEntity, RankingScoreModel);
  }

  replaceList(
    params: ReplaceListParams<RankedEventItem>,
    afterWrite?: AfterListWrite,
  ): Promise<ReplaceListResult> {
    return this.replace(params, afterWrite);
  }

  protected async writeItems(
    manager: TransactionManager,
    userId: string,
    items: readonly unknown[],
    computedAt: string,
  ): Promise<void> {
    await manager.delete(RankingScoreModel, { userId });
    if (items.length === 0) return;
    await manager.insert(
      RankingScoreModel,
      (items as readonly RankedEventItem[]).map((item) => ({
        userId,
        eventId: item.eventId,
        score: item.score,
        structuralScore: item.structuralScore,
        semanticScore: item.semanticScore,
        rank: item.rank,
        reasons: item.reasons,
        computedAt,
      })),
    );
  }

  async readPage(params: PageParams): Promise<ListPage<RankingScoreEntity>> {
    const run = await this.findRun(params.userId);
    if (!run) return { run: null, items: [] };
    const models = await this.createQueryBuilder('item')
      .where('item.userId = :userId AND item.rank > :afterRank', {
        userId: params.userId,
        afterRank: params.afterRank,
      })
      .orderBy('item.rank', 'ASC')
      .limit(params.limit)
      .getMany();
    return { run, items: this.toEntities(models) };
  }

  async updateRanks(
    userId: string,
    ranks: ReadonlyArray<{ eventId: string; rank: number }>,
  ): Promise<void> {
    if (ranks.length === 0) return;
    await this.repository.query(
      `UPDATE ranking_score s SET rank = v.rank
       FROM (SELECT unnest($2::uuid[]) AS event_id, unnest($3::integer[]) AS rank) v
       WHERE s.user_id = $1::uuid AND s.event_id = v.event_id`,
      [userId, ranks.map((entry) => entry.eventId), ranks.map((entry) => entry.rank)],
    );
  }

  async purgeByUser(
    userId: string,
    manager: TransactionManager = this.repository.manager,
  ): Promise<number> {
    const result = await manager.delete(RankingScoreModel, { userId });
    return result.affected ?? 0;
  }
}
