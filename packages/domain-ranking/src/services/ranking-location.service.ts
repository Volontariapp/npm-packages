import { Inject, Injectable } from '@nestjs/common';
import { Logger } from '@volontariapp/logger';
import type { GeoPoint } from '../helpers/geo.helpers.js';
import { decryptLocation, encryptLocation } from '../helpers/location-cipher.helpers.js';
import { withDatabaseError } from '../helpers/database-error.helpers.js';
import type { IRankingLocationRepository } from '../repositories/index.js';
import { PostgresRankingLocationRepository } from '../repositories/index.js';

/**
 * Position of a user: rounded to 1 km and encrypted before it is stored. The key is 32 random
 * bytes (a sealed secret) given by the caller, which owns the configuration.
 */
@Injectable()
export class RankingLocationService {
  private readonly logger = new Logger({ context: RankingLocationService.name });

  constructor(
    @Inject(PostgresRankingLocationRepository)
    private readonly locationRepository: IRankingLocationRepository,
  ) {}

  savePosition(userId: string, point: GeoPoint, key: string | Buffer): Promise<void> {
    const encrypted = encryptLocation(userId, point, key);
    return withDatabaseError(this.logger, `saving the position of ${userId}`, () =>
      this.locationRepository.save(userId, encrypted),
    );
  }

  /** null when the user never sent a position. A ciphertext of another user is refused. */
  async findPosition(userId: string, key: string | Buffer): Promise<GeoPoint | null> {
    const stored = await withDatabaseError(this.logger, `reading the position of ${userId}`, () =>
      this.locationRepository.findByUser(userId),
    );
    return stored ? decryptLocation(userId, stored.encrypted, key) : null;
  }
}
