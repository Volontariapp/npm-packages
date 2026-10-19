import type { TransactionManager } from '../sql.js';
import type { RankingPostScoreEntity } from '../../entities/index.js';
import type { PostOrigin } from '../../enums/index.js';
import type {
  AfterListWrite,
  ListPage,
  PageParams,
  ReplaceListParams,
  ReplaceListResult,
} from './ranked-list.repository.js';

/** A post of a computed feed, before it is written. */
export type RankedPostItem = Pick<
  RankingPostScoreEntity,
  'postId' | 'authorId' | 'score' | 'structuralScore' | 'semanticScore' | 'rank' | 'reasons'
> & { origin: PostOrigin };

export interface IRankingPostScoreRepository {
  replaceList(
    params: ReplaceListParams<RankedPostItem>,
    afterWrite?: AfterListWrite,
  ): Promise<ReplaceListResult>;
  readPage(params: PageParams): Promise<ListPage<RankingPostScoreEntity>>;
  purgeByUser(userId: string, manager?: TransactionManager): Promise<number>;
}
