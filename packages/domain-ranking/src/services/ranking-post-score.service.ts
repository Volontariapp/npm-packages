import { Inject, Injectable } from '@nestjs/common';
import { Logger } from '@volontariapp/logger';
import type { RankingPostScoreEntity } from '../entities/index.js';
import { withDatabaseError } from '../helpers/database-error.helpers.js';
import type {
  AfterListWrite,
  IRankingPostScoreRepository,
  ListPage,
  PageParams,
  RankedPostItem,
  ReplaceListParams,
  ReplaceListResult,
} from '../repositories/index.js';
import { PostgresRankingPostScoreRepository } from '../repositories/index.js';

/** The post feed of a user. */
@Injectable()
export class RankingPostScoreService {
  private readonly logger = new Logger({ context: RankingPostScoreService.name });

  constructor(
    @Inject(PostgresRankingPostScoreRepository)
    private readonly postScoreRepository: IRankingPostScoreRepository,
  ) {}

  replaceList(
    params: ReplaceListParams<RankedPostItem>,
    afterWrite?: AfterListWrite,
  ): Promise<ReplaceListResult> {
    return withDatabaseError(this.logger, `replacing the post feed of ${params.userId}`, () =>
      this.postScoreRepository.replaceList(params, afterWrite),
    );
  }

  readPage(params: PageParams): Promise<ListPage<RankingPostScoreEntity>> {
    return withDatabaseError(this.logger, `reading the post feed of ${params.userId}`, () =>
      this.postScoreRepository.readPage(params),
    );
  }
}
