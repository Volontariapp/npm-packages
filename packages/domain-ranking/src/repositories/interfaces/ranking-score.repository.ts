import type { TransactionManager } from '../sql.js';
import type { RankingScoreEntity } from '../../entities/index.js';
import type {
  AfterListWrite,
  ListPage,
  PageParams,
  ReplaceListParams,
  ReplaceListResult,
} from './ranked-list.repository.js';

/** An event of a computed list, before it is written. */
export type RankedEventItem = Pick<
  RankingScoreEntity,
  'eventId' | 'score' | 'structuralScore' | 'semanticScore' | 'rank' | 'reasons'
>;

export interface IRankingScoreRepository {
  /** Atomic replacement of the event list of a user, with the anti-overwrite and request rules. */
  replaceList(
    params: ReplaceListParams<RankedEventItem>,
    afterWrite?: AfterListWrite,
  ): Promise<ReplaceListResult>;
  readPage(params: PageParams): Promise<ListPage<RankingScoreEntity>>;
  /**
   * Persists the new ranks of the unserved events after the PASS penalties were applied (the
   * served ones keep theirs). The list version does not change.
   */
  updateRanks(userId: string, ranks: ReadonlyArray<{ eventId: string; rank: number }>): Promise<void>;
  purgeByUser(userId: string, manager?: TransactionManager): Promise<number>;
}
