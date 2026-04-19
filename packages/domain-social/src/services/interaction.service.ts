import { Injectable, Inject } from '@nestjs/common';
import { Logger } from '@volontariapp/logger';
import {
  DATABASE_ERROR,
  SOCIAL_RELATIONSHIP_ALREADY_EXISTS,
  SOCIAL_RELATIONSHIP_NOT_FOUND,
} from '@volontariapp/errors-nest';
import { isBaseError } from '@volontariapp/errors';
import { Neo4jInteractionRepository } from '../repositories/neo4j-interaction.repository.js';
import type { IInteractionRepository } from '../repositories/interfaces/interaction.repository.js';
import type { PaginatedIdsVO } from '../value-objects/paginated-ids.vo.js';

import { SocialUserMapper } from '../mappers/social-user.mapper.js';
import { SocialPostMapper } from '../mappers/social-post.mapper.js';
import { UserId, PostId } from '../value-objects/ids.vo.js';
import { PaginationVO } from '../value-objects/pagination.vo.js';

@Injectable()
export class InteractionService {
  private readonly logger = new Logger({ context: InteractionService.name });

  constructor(
    @Inject(Neo4jInteractionRepository)
    private readonly repository: IInteractionRepository,
  ) {}

  async likePost(userId: UserId, postId: PostId): Promise<void> {
    const user = SocialUserMapper.toEntity(userId);
    const post = SocialPostMapper.toEntity(postId);
    try {
      this.logger.log(`Creating like: user ${userId.value} -> post ${postId.value}`);
      if (await this.repository.likeExists(user, post)) {
        throw SOCIAL_RELATIONSHIP_ALREADY_EXISTS(userId.value, postId.value, 'LIKE');
      }
      await this.repository.createLike(user, post);
    } catch (error: unknown) {
      if (isBaseError(error)) throw error;
      this.logger.error(
        `Failed to create like: ${userId.value} -> ${postId.value}`,
        error as Error,
      );
      throw DATABASE_ERROR('creating like relationship', (error as Error).message);
    }
  }

  async unlikePost(userId: UserId, postId: PostId): Promise<void> {
    const user = SocialUserMapper.toEntity(userId);
    const post = SocialPostMapper.toEntity(postId);
    try {
      this.logger.log(`Deleting like: user ${userId.value} -> post ${postId.value}`);
      if (!(await this.repository.likeExists(user, post))) {
        throw SOCIAL_RELATIONSHIP_NOT_FOUND(userId.value, postId.value, 'LIKE');
      }
      await this.repository.deleteLike(user, post);
    } catch (error: unknown) {
      if (isBaseError(error)) throw error;
      this.logger.error(
        `Failed to delete like: ${userId.value} -> ${postId.value}`,
        error as Error,
      );
      throw DATABASE_ERROR('deleting like relationship', (error as Error).message);
    }
  }

  async getUserLikes(userId: UserId, pagination: PaginationVO): Promise<PaginatedIdsVO> {
    const user = SocialUserMapper.toEntity(userId);
    try {
      return await this.repository.getUserLikes(user, pagination);
    } catch (error: unknown) {
      if (isBaseError(error)) throw error;
      this.logger.error(`Failed to get likes for user: ${userId.value}`, error as Error);
      throw DATABASE_ERROR('fetching user likes', (error as Error).message);
    }
  }

  async getPostLikers(postId: PostId, pagination: PaginationVO): Promise<PaginatedIdsVO> {
    const post = SocialPostMapper.toEntity(postId);
    try {
      return await this.repository.getPostLikers(post, pagination);
    } catch (error: unknown) {
      if (isBaseError(error)) throw error;
      this.logger.error(`Failed to get likers for post: ${postId.value}`, error as Error);
      throw DATABASE_ERROR('fetching post likers', (error as Error).message);
    }
  }
}
