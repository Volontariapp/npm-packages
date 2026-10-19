import { Inject, Injectable } from '@nestjs/common';
import { Logger } from '@volontariapp/logger';
import { withDatabaseError } from '../helpers/database-error.helpers.js';
import type { IRankingEventWishRepository, Queryable } from '../repositories/index.js';
import { PostgresRankingEventWishRepository } from '../repositories/index.js';

/** Active wishes, fed by the wish and unwish streams (replaying a message is harmless). */
@Injectable()
export class RankingWishService {
  private readonly logger = new Logger({ context: RankingWishService.name });

  constructor(
    @Inject(PostgresRankingEventWishRepository)
    private readonly wishRepository: IRankingEventWishRepository,
  ) {}

  addWish(userId: string, eventId: string, executor?: Queryable): Promise<void> {
    return withDatabaseError(this.logger, `adding a wish of ${userId}`, () =>
      this.wishRepository.add(userId, eventId, executor),
    );
  }

  removeWish(userId: string, eventId: string, executor?: Queryable): Promise<void> {
    return withDatabaseError(this.logger, `removing a wish of ${userId}`, () =>
      this.wishRepository.removeWish(userId, eventId, executor),
    );
  }

  countByEvents(eventIds: readonly string[]): Promise<Map<string, number>> {
    return withDatabaseError(this.logger, 'counting the wishes per event', () =>
      this.wishRepository.countByEvents(eventIds),
    );
  }
}
