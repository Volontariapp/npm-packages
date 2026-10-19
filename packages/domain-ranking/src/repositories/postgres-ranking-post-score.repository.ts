import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import type { Repository } from '@volontariapp/database';
import type { TransactionManager } from './sql.js';
import { RankingPostScoreEntity } from '../entities/index.js';
import type { RankingListKind } from '../enums/index.js';
import { RankingListKind as ListKinds } from '../enums/index.js';
import { RankingPostScoreModel } from '../models/index.js';
import type {
  AfterListWrite,
  IRankingPostScoreRepository,
  ListPage,
  PageParams,
  RankedPostItem,
  ReplaceListParams,
  ReplaceListResult,
} from './interfaces/index.js';
import { PostgresRankedListRepository } from './postgres-ranked-list.repository.js';

/** The post feed of a user (table ranking_post_score). */
@Injectable()
export class PostgresRankingPostScoreRepository
  extends PostgresRankedListRepository<RankingPostScoreModel, RankingPostScoreEntity>
  implements IRankingPostScoreRepository
{
  protected readonly listKind: RankingListKind = ListKinds.POST;

  constructor(
    @InjectRepository(RankingPostScoreModel)
    repository: Repository<RankingPostScoreModel>,
  ) {
    super(repository, RankingPostScoreEntity, RankingPostScoreModel);
  }

  replaceList(
    params: ReplaceListParams<RankedPostItem>,
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
    await manager.delete(RankingPostScoreModel, { userId });
    if (items.length === 0) return;
    await manager.insert(
      RankingPostScoreModel,
      (items as readonly RankedPostItem[]).map((item) => ({
        userId,
        postId: item.postId,
        authorId: item.authorId,
        origin: item.origin,
        score: item.score,
        structuralScore: item.structuralScore,
        semanticScore: item.semanticScore,
        rank: item.rank,
        reasons: item.reasons,
        computedAt,
      })),
    );
  }

  async readPage(params: PageParams): Promise<ListPage<RankingPostScoreEntity>> {
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

  async purgeByUser(
    userId: string,
    manager: TransactionManager = this.repository.manager,
  ): Promise<number> {
    const result = await manager.delete(RankingPostScoreModel, { userId });
    return result.affected ?? 0;
  }
}
