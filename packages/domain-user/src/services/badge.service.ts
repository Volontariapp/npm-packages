import { Inject, Injectable } from '@nestjs/common';
import { Logger } from '@volontariapp/logger';
import { PostgresBadgeRepository } from '../repositories/postgres-badge.repository.js';
import type { IBadgeRepository } from '../repositories/index.js';
import { BadgeEntity } from '../entities/badge.entity.js';
import { isBaseError, isDatabaseDriverError } from '@volontariapp/errors';
import { BADGE_NOT_FOUND, BADGE_ALREADY_EXISTS, DATABASE_ERROR } from '@volontariapp/errors-nest';

@Injectable()
export class BadgeService {
  private readonly logger = new Logger({ context: BadgeService.name });

  constructor(
    @Inject(PostgresBadgeRepository)
    private readonly badgeRepository: IBadgeRepository,
  ) {}

  async findById(id: string): Promise<BadgeEntity> {
    try {
      const badge = await this.badgeRepository.findById(id);
      if (!badge) {
        this.logger.warn(`Badge with id ${id} not found`);
        throw BADGE_NOT_FOUND(id, 'id');
      }
      return badge;
    } catch (error) {
      if (isBaseError(error)) throw error;
      const err = error as Error;
      this.logger.error(`Error while finding badge by id ${id}: ${err.message}`);
      throw DATABASE_ERROR(`finding badge by id ${id}`, err.message);
    }
  }

  async findBySlug(slug: string): Promise<BadgeEntity> {
    try {
      const badge = await this.badgeRepository.findBySlug(slug);
      if (!badge) {
        this.logger.warn(`Badge with slug ${slug} not found`);
        throw BADGE_NOT_FOUND(slug, 'slug');
      }
      return badge;
    } catch (error) {
      if (isBaseError(error)) throw error;
      const err = error as Error;
      this.logger.error(`Error while finding badge by slug ${slug}: ${err.message}`);
      throw DATABASE_ERROR(`finding badge by slug ${slug}`, err.message);
    }
  }

  async findAll(): Promise<BadgeEntity[]> {
    try {
      return await this.badgeRepository.findAll();
    } catch (error) {
      if (isBaseError(error)) throw error;
      const err = error as Error;
      this.logger.error(`Error while finding all badges: ${err.message}`);
      throw DATABASE_ERROR('finding all badges', err.message);
    }
  }

  findManyByIds(ids: string[]): Promise<BadgeEntity[]> {
    try {
      return this.badgeRepository.findManyByIds(ids);
    } catch (error) {
      if (isBaseError(error)) throw error;
      const err = error as Error;
      this.logger.error(`Error while finding badges by ids ${ids.join(', ')}: ${err.message}`);
      throw DATABASE_ERROR(`finding badges by ids ${ids.join(', ')}`, err.message);
    }
  }

  async create(badgeData: Partial<BadgeEntity>): Promise<BadgeEntity> {
    try {
      return await this.badgeRepository.create(badgeData);
    } catch (error) {
      if (isBaseError(error)) throw error;
      if (isDatabaseDriverError(error) && error.code === '23505') {
        this.logger.warn(`Badge with slug ${badgeData.slug ?? 'unknown'} already exists`);
        throw BADGE_ALREADY_EXISTS(badgeData.slug ?? 'unknown');
      }
      const err = error as Error;
      this.logger.error(`Error while creating badge: ${err.message}`);
      throw DATABASE_ERROR('creating badge', err.message);
    }
  }

  async update(id: string, badgeData: Partial<BadgeEntity>): Promise<BadgeEntity> {
    try {
      const updatedBadge = await this.badgeRepository.update(id, badgeData);
      if (!updatedBadge) {
        this.logger.warn(`Badge with id ${id} not found for update`);
        throw BADGE_NOT_FOUND(id, 'id');
      }
      return updatedBadge;
    } catch (error) {
      if (isBaseError(error)) throw error;
      const err = error as Error;
      this.logger.error(`Error while updating badge with id ${id}: ${err.message}`);
      throw DATABASE_ERROR(`updating badge with id ${id}`, err.message);
    }
  }

  async delete(id: string): Promise<void> {
    try {
      const deleted = await this.badgeRepository.delete(id);
      if (!deleted) {
        this.logger.warn(`Badge with id ${id} not found for deletion`);
        throw BADGE_NOT_FOUND(id, 'id');
      }
    } catch (error) {
      if (isBaseError(error)) throw error;
      const err = error as Error;
      this.logger.error(`Error while deleting badge with id ${id}: ${err.message}`);
      throw DATABASE_ERROR(`deleting badge with id ${id}`, err.message);
    }
  }
}
