import { Inject, Injectable } from '@nestjs/common';
import { Logger } from '@volontariapp/logger';
import type { RankingRunEntity } from '../entities/index.js';
import type { RankingListKind } from '../enums/index.js';
import { withDatabaseError } from '../helpers/database-error.helpers.js';
import type {
  ActiveUser,
  ActiveUsersCursor,
  IRankingRunRepository,
  ListFreshness,
} from '../repositories/index.js';
import { PostgresRankingRunRepository } from '../repositories/index.js';

/** Last computation of the lists: freshness, coalescence and active users for the fan-out. */
@Injectable()
export class RankingRunService {
  private readonly logger = new Logger({ context: RankingRunService.name });

  constructor(
    @Inject(PostgresRankingRunRepository)
    private readonly runRepository: IRankingRunRepository,
  ) {}

  findByKey(userId: string, listKind: RankingListKind): Promise<RankingRunEntity | null> {
    return withDatabaseError(this.logger, `finding the ${listKind} run of ${userId}`, () =>
      this.runRepository.findByKey(userId, listKind),
    );
  }

  /** Step 0 of a computation: true when a later list already exists, so the job is skipped. */
  isUpToDate(params: {
    userId: string;
    listKind: RankingListKind;
    requestedAt: string;
    formulaVersion: number;
  }): Promise<boolean> {
    return withDatabaseError(this.logger, 'checking whether a list is up to date', () =>
      this.runRepository.isUpToDate(params),
    );
  }

  freshness(params: {
    userId: string;
    listKind: RankingListKind;
    maxAgeHours: number;
    formulaVersion: number;
  }): Promise<ListFreshness> {
    return withDatabaseError(this.logger, 'reading the freshness of a list', () =>
      this.runRepository.freshness(params),
    );
  }

  listActiveUsers(params: {
    listKind: RankingListKind;
    days: number;
    limit: number;
    after?: ActiveUsersCursor;
  }): Promise<ActiveUser[]> {
    return withDatabaseError(this.logger, 'listing the active users', () =>
      this.runRepository.listActiveUsers(params),
    );
  }
}
