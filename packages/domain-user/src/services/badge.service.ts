import { Inject, Injectable } from '@nestjs/common';
import { Logger } from '@volontariapp/logger';
import { PostgresBadgeRepository } from '../repositories/postgres-badge.repository.js';
import type { IBadgeRepository } from '../repositories/index.js';
import { BadgeEntity } from '../entities/badge.entity.js';
import { isBaseError, isDatabaseDriverError } from '@volontariapp/errors';
import { BADGE_NOT_FOUND, BADGE_ALREADY_EXISTS, DATABASE_ERROR } from '@volontariapp/errors-nest';
import { BadgeId, BadgeSlug, CreateBadgeInput, UpdateBadgeInput } from '../value-objects/index.js';

export { BadgeId, BadgeSlug, CreateBadgeInput, UpdateBadgeInput };

@Injectable()
export class BadgeService {
  private readonly logger = new Logger({ context: BadgeService.name });

  constructor(
    @Inject(PostgresBadgeRepository)
    private readonly badgeRepository: IBadgeRepository,
  ) {}

  async findById(id: BadgeId): Promise<BadgeEntity> {
    try {
      const badge = await this.badgeRepository.findById(id.value);
      if (!badge) {
        this.logger.warn(`Badge with id ${id.value} not found`);
        throw BADGE_NOT_FOUND(id.value, 'id');
      }
      return badge;
    } catch (error) {
      if (isBaseError(error)) throw error;
      const err = error as Error;
      this.logger.error(`Error while finding badge by id ${id.value}: ${err.message}`);
      throw DATABASE_ERROR(`finding badge by id ${id.value}`, err.message);
    }
  }

  async findBySlug(slug: BadgeSlug): Promise<BadgeEntity> {
    try {
      const badge = await this.badgeRepository.findBySlug(slug.value);
      if (!badge) {
        this.logger.warn(`Badge with slug ${slug.value} not found`);
        throw BADGE_NOT_FOUND(slug.value, 'slug');
      }
      return badge;
    } catch (error) {
      if (isBaseError(error)) throw error;
      const err = error as Error;
      this.logger.error(`Error while finding badge by slug ${slug.value}: ${err.message}`);
      throw DATABASE_ERROR(`finding badge by slug ${slug.value}`, err.message);
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

  async findManyByIds(ids: BadgeId[]): Promise<BadgeEntity[]> {
    try {
      return await this.badgeRepository.findManyByIds(ids.map((id) => id.value));
    } catch (error) {
      if (isBaseError(error)) throw error;
      const err = error as Error;
      const raw = ids.map((id) => id.value).join(', ');
      this.logger.error(`Error while finding badges by ids ${raw}: ${err.message}`);
      throw DATABASE_ERROR(`finding badges by ids ${raw}`, err.message);
    }
  }

  async create(input: CreateBadgeInput): Promise<BadgeEntity> {
    try {
      return await this.badgeRepository.create({
        name: input.name,
        slug: input.slug,
        description: input.description,
        iconPath: input.iconPath,
      });
    } catch (error) {
      if (isBaseError(error)) throw error;
      if (isDatabaseDriverError(error) && error.code === '23505') {
        this.logger.warn(`Badge with slug ${input.slug} already exists`);
        throw BADGE_ALREADY_EXISTS(input.slug);
      }
      const err = error as Error;
      this.logger.error(`Error while creating badge: ${err.message}`);
      throw DATABASE_ERROR('creating badge', err.message);
    }
  }

  async update(id: BadgeId, input: UpdateBadgeInput): Promise<BadgeEntity> {
    try {
      const updatedBadge = await this.badgeRepository.update(id.value, {
        name: input.name,
        slug: input.slug,
        description: input.description,
        iconPath: input.iconPath,
      });
      if (!updatedBadge) {
        this.logger.warn(`Badge with id ${id.value} not found for update`);
        throw BADGE_NOT_FOUND(id.value, 'id');
      }
      return updatedBadge;
    } catch (error) {
      if (isBaseError(error)) throw error;
      const err = error as Error;
      this.logger.error(`Error while updating badge with id ${id.value}: ${err.message}`);
      throw DATABASE_ERROR(`updating badge with id ${id.value}`, err.message);
    }
  }

  async delete(id: BadgeId): Promise<void> {
    try {
      const deleted = await this.badgeRepository.delete(id.value);
      if (!deleted) {
        this.logger.warn(`Badge with id ${id.value} not found for deletion`);
        throw BADGE_NOT_FOUND(id.value, 'id');
      }
    } catch (error) {
      if (isBaseError(error)) throw error;
      const err = error as Error;
      this.logger.error(`Error while deleting badge with id ${id.value}: ${err.message}`);
      throw DATABASE_ERROR(`deleting badge with id ${id.value}`, err.message);
    }
  }
}
