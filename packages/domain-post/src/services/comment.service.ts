import { Inject, Injectable } from '@nestjs/common';
import type { PaginatedResult } from '@volontariapp/database';
import { Logger } from '@volontariapp/logger';
import { DATABASE_ERROR, POST_NOT_FOUND } from '@volontariapp/errors-nest';
import { isBaseError } from '@volontariapp/errors';
import type { ICommentRepository, IPostRepository } from '../repositories/index.js';
import { CommentEntity } from '../entities/index.js';

@Injectable()
export class CommentService {
  private readonly logger = new Logger({ context: CommentService.name });

  constructor(
    @Inject('ICommentRepository')
    private readonly commentRepository: ICommentRepository,
    @Inject('IPostRepository')
    private readonly postRepository: IPostRepository,
  ) {}

  async findById(id: string): Promise<CommentEntity | null> {
    try {
      return await this.commentRepository.findById(id);
    } catch (error: unknown) {
      const err = error as Error;
      this.logger.error(`Failed to fetch comment by id ${id}`, err);
      throw DATABASE_ERROR('fetching comment by id', err.message);
    }
  }

  async listPaginatedByPostId(
    postId: string,
    page: number,
    limit: number,
  ): Promise<PaginatedResult<CommentEntity>> {
    try {
      return await this.commentRepository.listPaginatedByPostId(postId, page, limit);
    } catch (error: unknown) {
      const err = error as Error;
      this.logger.error(`Failed to list comments for post ${postId}`, err);
      throw DATABASE_ERROR('listing comments', err.message);
    }
  }

  async create(data: Partial<CommentEntity>): Promise<CommentEntity> {
    try {
      this.logger.log(`Creating comment on post: ${String(data.postId)}`);

      const post = await this.postRepository.findById(data.postId as string);
      if (!post) {
        throw POST_NOT_FOUND('Post not found');
      }

      return await this.commentRepository.create(data);
    } catch (error: unknown) {
      if (isBaseError(error)) throw error;
      const err = error as Error;
      this.logger.error('Failed to create comment', err);
      throw DATABASE_ERROR('creating comment', err.message);
    }
  }

  async delete(id: string): Promise<boolean> {
    try {
      this.logger.log(`Deleting comment ${id}`);
      return await this.commentRepository.delete(id);
    } catch (error: unknown) {
      const err = error as Error;
      this.logger.error(`Failed to delete comment ${id}`, err);
      throw DATABASE_ERROR('deleting comment', err.message);
    }
  }
}
