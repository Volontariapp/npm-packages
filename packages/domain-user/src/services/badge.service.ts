import { Inject, Injectable } from '@nestjs/common';
import { Logger } from '@volontariapp/logger';
import { PostgresBadgeRepository } from '../repositories/postgres-badge.repository.js';
import type { IBadgeRepository } from '../repositories/index.js';
import { BadgeEntity } from '../entities/badge.entity.js';

@Injectable()
export class BadgeService {
  private readonly logger = new Logger({ context: BadgeService.name });

  constructor(
    @Inject(PostgresBadgeRepository)
    private readonly badgeRepository: IBadgeRepository,
  ) {}

  async findById(id: string) {
    try {
      const badge = await this.badgeRepository.findById(id);
      if (!badge) {
        this.logger.warn(`Badge with id ${id} not found`);
        throw new Error('Badge not found');
      }
      return badge;
    } catch (error) {
      const err = error as Error;
      this.logger.error(`Error while finding badge by id ${id}: ${err.message}`);
      throw new Error('Error while finding badge');
    }
  }

  async findBySlug(slug: string) {
    try {
      const badge = await this.badgeRepository.findBySlug(slug);
      if (!badge) {
        this.logger.warn(`Badge with slug ${slug} not found`);
        throw new Error('Badge not found');
      }
      return badge;
    } catch (error) {
      const err = error as Error;
      this.logger.error(`Error while finding badge by slug ${slug}: ${err.message}`);
      throw new Error('Error while finding badge');
    }
  }

  async findAll() {
    try {
      return await this.badgeRepository.findAll();
    } catch (error) {
      const err = error as Error;
      this.logger.error(`Error while finding all badges: ${err.message}`);
      throw new Error('Error while finding badges');
    }
  }

  findManyByIds(ids: string[]) {
    try {
      return this.badgeRepository.findManyByIds(ids);
    } catch (error) {
      const err = error as Error;
      this.logger.error(`Error while finding badges by ids ${ids.join(', ')}: ${err.message}`);
      throw new Error('Error while finding badges');
    }
  }

  async create(badgeData: Partial<BadgeEntity>) {
    try {
      return await this.badgeRepository.create(badgeData);
    } catch (error) {
      const err = error as Error;
      this.logger.error(`Error while creating badge: ${err.message}`);
      throw new Error('Error while creating badge');
    }
  }

  async update(id: string, badgeData: Partial<BadgeEntity>) {
    try {
      const updatedBadge = await this.badgeRepository.update(id, badgeData);
      if (!updatedBadge) {
        this.logger.warn(`Badge with id ${id} not found for update`);
        throw new Error('Badge not found');
      }
      return updatedBadge;
    } catch (error) {
      const err = error as Error;
      this.logger.error(`Error while updating badge with id ${id}: ${err.message}`);
      throw new Error('Error while updating badge');
    }
  }

  async delete(id: string) {
    try {
      const deleted = await this.badgeRepository.delete(id);
      if (!deleted) {
        this.logger.warn(`Badge with id ${id} not found for deletion`);
        throw new Error('Badge not found');
      }
    } catch (error) {
      const err = error as Error;
      this.logger.error(`Error while deleting badge with id ${id}: ${err.message}`);
      throw new Error('Error while deleting badge');
    }
  }
}
