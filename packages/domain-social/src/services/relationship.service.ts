import { Injectable, Inject } from '@nestjs/common';
import { Logger } from '@volontariapp/logger';
import {
  DATABASE_ERROR,
  SOCIAL_RELATIONSHIP_ALREADY_EXISTS,
  SOCIAL_RELATIONSHIP_NOT_FOUND,
} from '@volontariapp/errors-nest';
import { isBaseError } from '@volontariapp/errors';
import { Neo4jRelationshipRepository } from '../repositories/neo4j-relationship.repository.js';
import type { IRelationshipRepository } from '../repositories/interfaces/relationship.repository.js';
import type { PaginatedIdsVO } from '../value-objects/paginated-ids.vo.js';

import { SocialUserMapper } from '../mappers/social-user.mapper.js';
import { UserId } from '../value-objects/ids.vo.js';
import { PaginationVO } from '../value-objects/pagination.vo.js';

@Injectable()
export class RelationshipService {
  private readonly logger = new Logger({ context: RelationshipService.name });

  constructor(
    @Inject(Neo4jRelationshipRepository)
    private readonly repository: IRelationshipRepository,
  ) {}

  async followUser(followerId: UserId, followedId: UserId): Promise<void> {
    const follower = SocialUserMapper.toEntity(followerId);
    const followed = SocialUserMapper.toEntity(followedId);
    try {
      this.logger.log(`Creating follow: ${followerId.value} -> ${followedId.value}`);
      if (await this.repository.relationshipExists(follower, followed, 'FOLLOW')) {
        throw SOCIAL_RELATIONSHIP_ALREADY_EXISTS(followerId.value, followedId.value, 'FOLLOW');
      }
      await this.repository.createFollow(follower, followed);
    } catch (error: unknown) {
      if (isBaseError(error)) throw error;
      this.logger.error(
        `Failed to create follow: ${followerId.value} -> ${followedId.value}`,
        error as Error,
      );
      throw DATABASE_ERROR('creating follow relationship', (error as Error).message);
    }
  }

  async unfollowUser(followerId: UserId, followedId: UserId): Promise<void> {
    const follower = SocialUserMapper.toEntity(followerId);
    const followed = SocialUserMapper.toEntity(followedId);
    try {
      this.logger.log(`Deleting follow: ${followerId.value} -> ${followedId.value}`);
      if (!(await this.repository.relationshipExists(follower, followed, 'FOLLOW'))) {
        throw SOCIAL_RELATIONSHIP_NOT_FOUND(followerId.value, followedId.value, 'FOLLOW');
      }
      await this.repository.deleteFollow(follower, followed);
    } catch (error: unknown) {
      if (isBaseError(error)) throw error;
      this.logger.error(
        `Failed to delete follow: ${followerId.value} -> ${followedId.value}`,
        error as Error,
      );
      throw DATABASE_ERROR('deleting follow relationship', (error as Error).message);
    }
  }

  async blockUser(blockerId: UserId, blockedId: UserId): Promise<void> {
    const blocker = SocialUserMapper.toEntity(blockerId);
    const blocked = SocialUserMapper.toEntity(blockedId);
    try {
      this.logger.log(`Creating block: ${blockerId.value} -> ${blockedId.value}`);
      if (await this.repository.relationshipExists(blocker, blocked, 'BLOCK')) {
        throw SOCIAL_RELATIONSHIP_ALREADY_EXISTS(blockerId.value, blockedId.value, 'BLOCK');
      }
      await this.repository.createBlock(blocker, blocked);
    } catch (error: unknown) {
      if (isBaseError(error)) throw error;
      this.logger.error(
        `Failed to create block: ${blockerId.value} -> ${blockedId.value}`,
        error as Error,
      );
      throw DATABASE_ERROR('creating block relationship', (error as Error).message);
    }
  }

  async unblockUser(blockerId: UserId, blockedId: UserId): Promise<void> {
    const blocker = SocialUserMapper.toEntity(blockerId);
    const blocked = SocialUserMapper.toEntity(blockedId);
    try {
      this.logger.log(`Deleting block: ${blockerId.value} -> ${blockedId.value}`);
      if (!(await this.repository.relationshipExists(blocker, blocked, 'BLOCK'))) {
        throw SOCIAL_RELATIONSHIP_NOT_FOUND(blockerId.value, blockedId.value, 'BLOCK');
      }
      await this.repository.deleteBlock(blocker, blocked);
    } catch (error: unknown) {
      if (isBaseError(error)) throw error;
      this.logger.error(
        `Failed to delete block: ${blockerId.value} -> ${blockedId.value}`,
        error as Error,
      );
      throw DATABASE_ERROR('deleting block relationship', (error as Error).message);
    }
  }

  async getFollows(userId: UserId, pagination: PaginationVO): Promise<PaginatedIdsVO> {
    const user = SocialUserMapper.toEntity(userId);
    try {
      return await this.repository.getFollows(user, pagination);
    } catch (error: unknown) {
      if (isBaseError(error)) throw error;
      this.logger.error(`Failed to get follows for: ${userId.value}`, error as Error);
      throw DATABASE_ERROR('fetching follows', (error as Error).message);
    }
  }

  async getFollowers(userId: UserId, pagination: PaginationVO): Promise<PaginatedIdsVO> {
    const user = SocialUserMapper.toEntity(userId);
    try {
      return await this.repository.getFollowers(user, pagination);
    } catch (error: unknown) {
      if (isBaseError(error)) throw error;
      this.logger.error(`Failed to get followers for: ${userId.value}`, error as Error);
      throw DATABASE_ERROR('fetching followers', (error as Error).message);
    }
  }

  async getBlocks(userId: UserId, pagination: PaginationVO): Promise<PaginatedIdsVO> {
    const user = SocialUserMapper.toEntity(userId);
    try {
      return await this.repository.getBlocks(user, pagination);
    } catch (error: unknown) {
      if (isBaseError(error)) throw error;
      this.logger.error(`Failed to get blocks for: ${userId.value}`, error as Error);
      throw DATABASE_ERROR('fetching blocks', (error as Error).message);
    }
  }

  async getWhoBlockedMe(userId: UserId, pagination: PaginationVO): Promise<PaginatedIdsVO> {
    const user = SocialUserMapper.toEntity(userId);
    try {
      return await this.repository.getWhoBlockedMe(user, pagination);
    } catch (error: unknown) {
      if (isBaseError(error)) throw error;
      this.logger.error(`Failed to get who blocked: ${userId.value}`, error as Error);
      throw DATABASE_ERROR('fetching who blocked me', (error as Error).message);
    }
  }
}
