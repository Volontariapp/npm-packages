import { Inject, Injectable } from '@nestjs/common';
import { Logger } from '@volontariapp/logger';
import { TAG_NOT_FOUND, TAG_ALREADY_EXISTS, DATABASE_ERROR } from '@volontariapp/errors-nest';
import { isBaseError } from '@volontariapp/errors';
import type { ITagRepository } from '../repositories/interfaces/tag.repository.js';
import { PostgresTagRepository } from '../repositories/postgres-tag.repository.js';
import { TagEntity } from '../entities/tag.entity.js';

@Injectable()
export class TagService {
  private readonly logger = new Logger({ context: TagService.name });

  constructor(
    @Inject(PostgresTagRepository)
    private readonly tagRepository: ITagRepository,
  ) {}

  async findAll(): Promise<TagEntity[]> {
    try {
      this.logger.debug('Fetching all tags');
      return await this.tagRepository.findAll();
    } catch (error: unknown) {
      const err = error as Error;
      this.logger.error('Failed to fetch tags', err);
      throw DATABASE_ERROR('fetching all tags', err.message);
    }
  }

  async findById(id: string): Promise<TagEntity> {
    try {
      const tag = await this.tagRepository.findById(id);
      if (!tag) {
        throw TAG_NOT_FOUND(id);
      }
      return tag;
    } catch (error: unknown) {
      if (isBaseError(error)) throw error;
      const err = error as Error;
      this.logger.error(`Failed to fetch tag: ${id}`, err);
      throw DATABASE_ERROR(`finding tag by id: ${id}`, err.message);
    }
  }

  async findByIds(ids: string[]): Promise<TagEntity[]> {
    try {
      this.logger.debug(`Fetching tags by ids: ${ids.join(', ')}`);
      return await this.tagRepository.findByIds(ids);
    } catch (error: unknown) {
      const err = error as Error;
      this.logger.error(`Failed to fetch tags by ids: ${ids.join(', ')}`, err);
      throw DATABASE_ERROR(`finding tags by ids: ${ids.join(', ')}`, err.message);
    }
  }

  async findBySlug(slug: string): Promise<TagEntity> {
    try {
      const tag = await this.tagRepository.findBySlug(slug);
      if (!tag) {
        throw TAG_NOT_FOUND(slug);
      }
      return tag;
    } catch (error: unknown) {
      if (isBaseError(error)) throw error;
      const err = error as Error;
      this.logger.error(`Failed to fetch tag by slug: ${slug}`, err);
      throw DATABASE_ERROR(`finding tag by slug: ${slug}`, err.message);
    }
  }

  async create(tagData: Partial<TagEntity>): Promise<TagEntity> {
    try {
      if (tagData.slug !== undefined && tagData.slug !== '') {
        const existing = await this.tagRepository.findBySlug(tagData.slug);
        if (existing) {
          throw TAG_ALREADY_EXISTS(tagData.slug);
        }
      }
      this.logger.log(`Creating new tag: ${String(tagData.name)}`);
      return await this.tagRepository.create(tagData);
    } catch (error: unknown) {
      if (isBaseError(error)) throw error;
      const err = error as Error;
      this.logger.error('Failed to create tag', err);
      throw DATABASE_ERROR('creating tag', err.message);
    }
  }

  async update(id: string, tagData: Partial<TagEntity>): Promise<TagEntity> {
    try {
      const tag = await this.findById(id);
      this.logger.log(`Updating tag: ${id}`);
      const merged = Object.assign(new TagEntity(), tag, tagData);
      const updated = await this.tagRepository.update(id, merged);
      if (!updated) {
        throw TAG_NOT_FOUND(id);
      }
      return updated;
    } catch (error: unknown) {
      if (isBaseError(error)) throw error;
      const err = error as Error;
      this.logger.error(`Failed to update tag: ${id}`, err);
      throw DATABASE_ERROR(`updating tag: ${id}`, err.message);
    }
  }

  async delete(id: string): Promise<void> {
    try {
      await this.findById(id);
      this.logger.log(`Deleting tag: ${id}`);
      await this.tagRepository.delete(id);
    } catch (error: unknown) {
      if (isBaseError(error)) throw error;
      const err = error as Error;
      this.logger.error(`Failed to delete tag: ${id}`, err);
      throw DATABASE_ERROR(`deleting tag: ${id}`, err.message);
    }
  }
}
