import { Inject, Injectable } from '@nestjs/common';
import { Logger } from '@volontariapp/logger';
import {
  DEFAULT_ACTIVE_LOCATION_MAX_AGE_MINUTES,
  MAX_ACTIVE_LOCATIONS,
} from '../constants/index.js';
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

  /**
   * Distinct positions (rounded to 1 km) of the users who sent one less than `maxAgeMinutes` ago,
   * without any user identifier. A position that cannot be decrypted is skipped, never fatal.
   * `maxAgeMinutes <= 0` means the default window.
   */
  async listActiveCells(
    maxAgeMinutes: number,
    key: string | Buffer,
    now: Date = new Date(),
  ): Promise<GeoPoint[]> {
    const windowMinutes =
      maxAgeMinutes > 0 ? maxAgeMinutes : DEFAULT_ACTIVE_LOCATION_MAX_AGE_MINUTES;
    const since = new Date(now.getTime() - windowMinutes * 60_000);
    const rows = await withDatabaseError(this.logger, 'reading the recent positions', () =>
      this.locationRepository.findUpdatedSince(since, MAX_ACTIVE_LOCATIONS),
    );

    const cells = new Map<string, GeoPoint>();
    let skipped = 0;
    for (const row of rows) {
      try {
        const point = decryptLocation(row.userId, row.encrypted, key);
        cells.set(`${String(point.lat)},${String(point.lng)}`, { lat: point.lat, lng: point.lng });
      } catch {
        skipped++;
      }
    }
    if (skipped > 0) {
      this.logger.warn(`${String(skipped)} position(s) skipped: unreadable ciphertext`);
    }
    return [...cells.values()];
  }
}
