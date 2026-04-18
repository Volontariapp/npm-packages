import { Injectable, Inject } from '@nestjs/common';
import { Logger } from '@volontariapp/logger';
import {
  DATABASE_ERROR,
  SOCIAL_POST_ALREADY_EXISTS,
  SOCIAL_POST_NOT_FOUND,
} from '@volontariapp/errors-nest';
import { isBaseError } from '@volontariapp/errors';
import { Neo4jPublicationRepository } from '../repositories/neo4j-publication.repository.js';
import type { IPublicationRepository } from '../repositories/interfaces/publication.repository.js';
import type { PaginatedIdsVO } from '../value-objects/paginated-ids.vo.js';

import { SocialUserMapper } from '../mappers/social-user.mapper.js';
import { SocialPostMapper } from '../mappers/social-post.mapper.js';
import { UserId, PostId } from '../value-objects/ids.vo.js';
import { PaginationVO } from '../value-objects/pagination.vo.js';

@Injectable()
export class PublicationService {
  private readonly logger = new Logger({ context: PublicationService.name });

  constructor(
    @Inject(Neo4jPublicationRepository)
    private readonly repository: IPublicationRepository,
  ) {}

  async createPost(postId: PostId): Promise<void> {
    const post = SocialPostMapper.toEntity(postId);
    try {
      this.logger.log(`Creating social post node: ${postId.value}`);
      if (await this.repository.postExists(post)) {
        throw SOCIAL_POST_ALREADY_EXISTS(postId.value);
      }
      await this.repository.createPostNode(post);
    } catch (error: unknown) {
      if (isBaseError(error)) throw error;
      this.logger.error(`Failed to create social post node: ${postId.value}`, error as Error);
      throw DATABASE_ERROR('creating social post node', (error as Error).message);
    }
  }

  async deletePost(postId: PostId): Promise<void> {
    const post = SocialPostMapper.toEntity(postId);
    try {
      this.logger.log(`Deleting social post node: ${postId.value}`);
      if (!(await this.repository.postExists(post))) {
        throw SOCIAL_POST_NOT_FOUND(postId.value);
      }
      await this.repository.deletePostNode(post);
    } catch (error: unknown) {
      if (isBaseError(error)) throw error;
      this.logger.error(`Failed to delete social post node: ${postId.value}`, error as Error);
      throw DATABASE_ERROR('deleting social post node', (error as Error).message);
    }
  }

  async getPostExists(postId: PostId): Promise<boolean> {
    const post = SocialPostMapper.toEntity(postId);
    try {
      return await this.repository.postExists(post);
    } catch (error: unknown) {
      if (isBaseError(error)) throw error;
      this.logger.error(`Failed to check post existence: ${postId.value}`, error as Error);
      throw DATABASE_ERROR('checking social post existence', (error as Error).message);
    }
  }

  async ownPost(userId: UserId, postId: PostId): Promise<void> {
    const user = SocialUserMapper.toEntity(userId);
    const post = SocialPostMapper.toEntity(postId);
    try {
      this.logger.log(`Creating ownership: user ${userId.value} owns post ${postId.value}`);
      await this.repository.createOwnership(user, post);
    } catch (error: unknown) {
      if (isBaseError(error)) throw error;
      this.logger.error(
        `Failed to create ownership: ${userId.value} -> ${postId.value}`,
        error as Error,
      );
      throw DATABASE_ERROR('creating post ownership', (error as Error).message);
    }
  }

  async disownPost(userId: UserId, postId: PostId): Promise<void> {
    const user = SocialUserMapper.toEntity(userId);
    const post = SocialPostMapper.toEntity(postId);
    try {
      this.logger.log(`Deleting ownership: user ${userId.value} -> post ${postId.value}`);
      await this.repository.deleteOwnership(user, post);
    } catch (error: unknown) {
      if (isBaseError(error)) throw error;
      this.logger.error(
        `Failed to delete ownership: ${userId.value} -> ${postId.value}`,
        error as Error,
      );
      throw DATABASE_ERROR('deleting post ownership', (error as Error).message);
    }
  }

  async getUserPosts(userId: UserId, pagination: PaginationVO): Promise<PaginatedIdsVO> {
    const user = SocialUserMapper.toEntity(userId);
    try {
      return await this.repository.getUserPosts(user, pagination);
    } catch (error: unknown) {
      if (isBaseError(error)) throw error;
      this.logger.error(`Failed to get posts for user: ${userId.value}`, error as Error);
      throw DATABASE_ERROR('fetching user posts', (error as Error).message);
    }
  }

  async getFeed(userId: UserId, pagination: PaginationVO): Promise<PaginatedIdsVO> {
    const user = SocialUserMapper.toEntity(userId);
    try {
      return await this.repository.getFeed(user, pagination);
    } catch (error: unknown) {
      if (isBaseError(error)) throw error;
      this.logger.error(`Failed to get feed for user: ${userId.value}`, error as Error);
      throw DATABASE_ERROR('fetching user feed', (error as Error).message);
    }
  }
}
