import { Inject, Injectable } from '@nestjs/common';
import { Logger } from '@volontariapp/logger';
import type { RankingScoreEntity } from '../entities/index.js';
import { withDatabaseError } from '../helpers/database-error.helpers.js';
import type {
  AfterListWrite,
  IRankingScoreRepository,
  ListPage,
  PageParams,
  RankedEventItem,
  ReplaceListParams,
  ReplaceListResult,
} from '../repositories/index.js';
import { PostgresRankingScoreRepository } from '../repositories/index.js';

/** The event list of a user. */
@Injectable()
export class RankingScoreService {
  private readonly logger = new Logger({ context: RankingScoreService.name });

  constructor(
    @Inject(PostgresRankingScoreRepository)
    private readonly scoreRepository: IRankingScoreRepository,
  ) {}

  /** Atomic replacement of the list. `afterWrite` runs in the same transaction (follow-up job). */
  replaceList(
    params: ReplaceListParams<RankedEventItem>,
    afterWrite?: AfterListWrite,
  ): Promise<ReplaceListResult> {
    return withDatabaseError(this.logger, `replacing the event list of ${params.userId}`, () =>
      this.scoreRepository.replaceList(params, afterWrite),
    );
  }

  /** Ask for limit + 1 rows to know whether the list goes on. */
  readPage(params: PageParams): Promise<ListPage<RankingScoreEntity>> {
    return withDatabaseError(this.logger, `reading the event list of ${params.userId}`, () =>
      this.scoreRepository.readPage(params),
    );
  }

  /** Persists the ranks renumbered by the PASS penalties so that the cursor stays exact. */
  updateRanks(
    userId: string,
    ranks: ReadonlyArray<{ eventId: string; rank: number }>,
  ): Promise<void> {
    return withDatabaseError(this.logger, `updating the ranks of ${userId}`, () =>
      this.scoreRepository.updateRanks(userId, ranks),
    );
  }
}
