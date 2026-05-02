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

  private async db<T>(context: string, fn: () => Promise<T>): Promise<T> {
    try {
      return await fn();
    } catch (error) {
      if (isBaseError(error)) throw error;
      const err = error as Error;
      this.logger.error(`Error while ${context}: ${err.message}`);
      throw DATABASE_ERROR(context, err.message);
    }
  }

  async findById(id: BadgeId): Promise<BadgeEntity> {
    const badge = await this.db(`finding badge by id ${id.value}`, () =>
      this.badgeRepository.findById(id.value),
    );
    if (!badge) {
      this.logger.warn(`Badge with id ${id.value} not found`);
      throw BADGE_NOT_FOUND(id.value, 'id');
    }
    return badge;
  }

  async findBySlug(slug: BadgeSlug): Promise<BadgeEntity> {
    const badge = await this.db(`finding badge by slug ${slug.value}`, () =>
      this.badgeRepository.findBySlug(slug.value),
    );
    if (!badge) {
      this.logger.warn(`Badge with slug ${slug.value} not found`);
      throw BADGE_NOT_FOUND(slug.value, 'slug');
    }
    return badge;
  }

  async findAll(): Promise<BadgeEntity[]> {
    return this.db('finding all badges', () => this.badgeRepository.findAll());
  }

  async findManyByIds(ids: BadgeId[]): Promise<BadgeEntity[]> {
    const raw = ids.map((id) => id.value).join(', ');
    return this.db(`finding badges by ids ${raw}`, () =>
      this.badgeRepository.findManyByIds(ids.map((id) => id.value)),
    );
  }

  async create(input: CreateBadgeInput): Promise<BadgeEntity> {
    const existingBadge = await this.badgeRepository.findBySlug(input.slug);
    if (existingBadge) {
      this.logger.warn(`Attempt to create badge with already existing slug: ${input.slug}`);
      throw BADGE_ALREADY_EXISTS(input.slug);
    }
    return this.db('creating badge', async () => {
      try {
        return await this.badgeRepository.create({
          name: input.name,
          slug: input.slug,
          description: input.description,
          iconPath: input.iconPath,
        });
      } catch (error) {
        if (isDatabaseDriverError(error) && error.code === '23505') {
          this.logger.warn(`Badge with slug ${input.slug} already exists`);
          throw BADGE_ALREADY_EXISTS(input.slug);
        }
        throw error;
      }
    });
  }

  async update(id: BadgeId, input: UpdateBadgeInput): Promise<BadgeEntity> {
    const updatedBadge = await this.db(`updating badge with id ${id.value}`, () =>
      this.badgeRepository.update(id.value, {
        name: input.name,
        slug: input.slug,
        description: input.description,
        iconPath: input.iconPath,
      }),
    );
    if (!updatedBadge) {
      this.logger.warn(`Badge with id ${id.value} not found for update`);
      throw BADGE_NOT_FOUND(id.value, 'id');
    }
    return updatedBadge;
  }

  async delete(id: BadgeId): Promise<void> {
    const deleted = await this.db(`deleting badge with id ${id.value}`, () =>
      this.badgeRepository.delete(id.value),
    );
    if (!deleted) {
      this.logger.warn(`Badge with id ${id.value} not found for deletion`);
      throw BADGE_NOT_FOUND(id.value, 'id');
    }
  }
}
