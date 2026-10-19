import { Inject, Injectable } from '@nestjs/common';
import { Logger } from '@volontariapp/logger';
import { withDatabaseError } from '../helpers/database-error.helpers.js';
import type { IRankingRateBucketRepository, Queryable } from '../repositories/index.js';
import { PostgresRankingRateBucketRepository } from '../repositories/index.js';

/**
 * Rate limits kept in PostgreSQL (no Redis limiter exists on the platform). A refusal is a
 * normal answer, not an error: the callers answer `refreshThrottled` or ignore the update.
 */
@Injectable()
export class RankingRateLimitService {
  private readonly logger = new Logger({ context: RankingRateLimitService.name });

  constructor(
    @Inject(PostgresRankingRateBucketRepository)
    private readonly bucketRepository: IRankingRateBucketRepository,
  ) {}

  /** POST /ranking/refresh: 5 per minute, shared by the events and the posts. */
  allowRefresh(userId: string, executor?: Queryable): Promise<boolean> {
    return withDatabaseError(this.logger, `taking a refresh token for ${userId}`, () =>
      this.bucketRepository.tryConsumeRefresh(userId, executor),
    );
  }

  /** PUT /ranking/location: 1 per minute. */
  allowLocationUpdate(userId: string, executor?: Queryable): Promise<boolean> {
    return withDatabaseError(this.logger, `taking a location token for ${userId}`, () =>
      this.bucketRepository.tryConsumeLocation(userId, executor),
    );
  }
}
