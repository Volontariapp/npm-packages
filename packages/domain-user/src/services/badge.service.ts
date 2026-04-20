import { Inject, Injectable } from '@nestjs/common';
import { Logger } from '@volontariapp/logger';
import { PostgresBadgeRepository } from '../repositories/postgres-badge.repository.js';
import type { IBadgeRepository } from '../repositories/index.js';

@Injectable()
export class BadgeService {
  private readonly logger = new Logger({ context: BadgeService.name });

  constructor(
    @Inject(PostgresBadgeRepository)
    private readonly badgeRepository: IBadgeRepository,
  ) {}
}
