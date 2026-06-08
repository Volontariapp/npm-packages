import { Inject, Injectable } from '@nestjs/common';
import type { PaginatedResult } from '@volontariapp/database';
import { Logger } from '@volontariapp/logger';
import { DATABASE_ERROR, POST_ALREADY_EXISTS, POST_NOT_FOUND } from '@volontariapp/errors-nest';
import { isDatabaseDriverError, isBaseError } from '@volontariapp/errors';
import type { IPostRepository } from '../repositories/index.js';
import { PostgresPostRepository } from '../repositories/index.js';

import { PostEntity } from '../entities/index.js';

@Injectable()
export class PostService {
  private readonly logger = new Logger({ context: PostService.name });

  constructor(@Inject(PostgresPostRepository) private readonly postRepository: IPostRepository) {}

  async findById(id: string): Promise<PostEntity> {
    try {
      const post = await this.postRepository.findById(id);
      if (!post) {
        throw POST_NOT_FOUND(id);
      }
      return post;
    } catch (error: unknown) {
      if (isBaseError(error)) throw error;
      const err = error as Error;
      this.logger.error(`Failed to find post: ${id}`, err);
      throw DATABASE_ERROR(`finding post: ${id}`, err.message);
    }
  }

  async findByAuthorId(authorId: string): Promise<PostEntity[]> {
    try {
      return await this.postRepository.findByAuthorId(authorId);
    } catch (error: unknown) {
      if (isBaseError(error)) throw error;
      const err = error as Error;
      this.logger.error(`Failed to find posts for author: ${authorId}`, err);
      throw DATABASE_ERROR(`finding posts for author: ${authorId}`, err.message);
    }
  }

  async findAll(): Promise<PostEntity[]> {
    try {
      return await this.postRepository.findAll();
    } catch (error: unknown) {
      const err = error as Error;
      this.logger.error('Failed to fetch posts', err);
      throw DATABASE_ERROR('fetching all posts', err.message);
    }
  }

  async listPosts(
    page: number,
    limit: number,
    authorId?: string,
  ): Promise<PaginatedResult<PostEntity>> {
    try {
      return await this.postRepository.listPaginated(page, limit, authorId);
    } catch (error: unknown) {
      if (isBaseError(error)) throw error;
      const err = error as Error;
      this.logger.error(`Failed to list posts with pagination`, err);
      throw DATABASE_ERROR(`listing posts with pagination`, err.message);
    }
  }

  async create(data: Partial<PostEntity>): Promise<PostEntity> {
    try {
      this.logger.log(`Creating post: ${String(data.title)}`);

      return await this.postRepository.createWithPostCreated(data);
    } catch (error: unknown) {
      if (isBaseError(error)) throw error;

      if (isDatabaseDriverError(error) && error.code === '23505') {
        throw POST_ALREADY_EXISTS(data.title ?? 'Unknown');
      }

      const err = error as Error;
      this.logger.error('Failed to create post', err);
      throw DATABASE_ERROR('creating post', err.message);
    }
  }

  async update(id: string, data: Partial<PostEntity>): Promise<PostEntity> {
    try {
      const updated = await this.postRepository.update(id, data);
      if (!updated) {
        throw POST_NOT_FOUND(id);
      }
      return updated;
    } catch (error: unknown) {
      if (isBaseError(error)) throw error;

      if (isDatabaseDriverError(error) && error.code === '23505') {
        throw POST_ALREADY_EXISTS(data.title ?? id);
      }

      const err = error as Error;
      this.logger.error(`Failed to update post: ${id}`, err);
      throw DATABASE_ERROR(`updating post: ${id}`, err.message);
    }
  }

  async delete(id: string): Promise<void> {
    try {
      this.logger.log(`Deleting post: ${id}`);
      const deleted = await this.postRepository.deleteWithPostDeleted(id);
      if (!deleted) {
        throw POST_NOT_FOUND(id);
      }
    } catch (error: unknown) {
      if (isBaseError(error)) throw error;
      const err = error as Error;
      this.logger.error(`Failed to delete post: ${id}`, err);
      throw DATABASE_ERROR(`deleting post: ${id}`, err.message);
    }
  }

  async deleteByAuthorId(authorId: string): Promise<number> {
    try {
      this.logger.log(`Deleting all posts for author: ${authorId}`);
      const affectedCount = await this.postRepository.deleteByAuthorId(authorId);

      this.logger.log(
        `Successfully deleted ${String(affectedCount)} posts for author: ${authorId}`,
      );
      return affectedCount;
    } catch (error: unknown) {
      if (isBaseError(error)) throw error;
      const err = error as Error;

      this.logger.error(`Failed to delete posts for author: ${authorId}`, err);
      throw DATABASE_ERROR(`deleting posts for author: ${authorId}`, err.message);
    }
  }
}
