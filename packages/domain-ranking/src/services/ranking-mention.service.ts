import { Inject, Injectable } from '@nestjs/common';
import { Logger } from '@volontariapp/logger';
import { withDatabaseError } from '../helpers/database-error.helpers.js';
import type { IRankingEventMentionRepository, Queryable } from '../repositories/index.js';
import { PostgresRankingEventMentionRepository } from '../repositories/index.js';

/** Posts linked to an event: the popularity counts the distinct authors. */
@Injectable()
export class RankingMentionService {
  private readonly logger = new Logger({ context: RankingMentionService.name });

  constructor(
    @Inject(PostgresRankingEventMentionRepository)
    private readonly mentionRepository: IRankingEventMentionRepository,
  ) {}

  addMention(
    mention: { postId: string; eventId: string; authorId: string },
    executor?: Queryable,
  ): Promise<void> {
    return withDatabaseError(this.logger, `adding the mention of post ${mention.postId}`, () =>
      this.mentionRepository.add(mention, executor),
    );
  }

  removeMention(postId: string, executor?: Queryable): Promise<void> {
    return withDatabaseError(this.logger, `removing the mention of post ${postId}`, () =>
      this.mentionRepository.removeByPost(postId, executor),
    );
  }

  countDistinctAuthors(
    eventIds: readonly string[],
    windowDays: number,
  ): Promise<Map<string, number>> {
    return withDatabaseError(this.logger, 'counting the distinct authors per event', () =>
      this.mentionRepository.countDistinctAuthors(eventIds, windowDays),
    );
  }
}
