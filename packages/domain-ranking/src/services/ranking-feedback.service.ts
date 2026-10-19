import { Inject, Injectable } from '@nestjs/common';
import { Logger } from '@volontariapp/logger';
import { withDatabaseError } from '../helpers/database-error.helpers.js';
import type { IRankingEventFeedbackRepository, Queryable } from '../repositories/index.js';
import { PostgresRankingEventFeedbackRepository } from '../repositories/index.js';

/** Swipes to the left (PASS). */
@Injectable()
export class RankingFeedbackService {
  private readonly logger = new Logger({ context: RankingFeedbackService.name });

  constructor(
    @Inject(PostgresRankingEventFeedbackRepository)
    private readonly feedbackRepository: IRankingEventFeedbackRepository,
  ) {}

  /** Records a batch of 50 PASS at most (a larger batch is a bad request). Returns the count. */
  recordPasses(userId: string, eventIds: readonly string[], executor?: Queryable): Promise<number> {
    return withDatabaseError(this.logger, `recording the passes of ${userId}`, () =>
      this.feedbackRepository.recordPasses(userId, eventIds, executor),
    );
  }

  /** Events passed during the cooldown: removed from the candidates. */
  listRecentPassedEventIds(userId: string, days: number): Promise<string[]> {
    return withDatabaseError(this.logger, `listing the recent passes of ${userId}`, () =>
      this.feedbackRepository.listRecentPassedEventIds(userId, days),
    );
  }

  countPasses(eventIds: readonly string[]): Promise<Map<string, number>> {
    return withDatabaseError(this.logger, 'counting the passes per event', () =>
      this.feedbackRepository.countPasses(eventIds),
    );
  }
}
