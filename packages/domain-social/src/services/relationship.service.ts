import { Injectable, Inject } from '@nestjs/common';
import { Logger } from '@volontariapp/logger';
import type { PaginationRequest } from '@volontariapp/contracts';
import {
  DATABASE_ERROR,
  SOCIAL_RELATIONSHIP_ALREADY_EXISTS,
  SOCIAL_RELATIONSHIP_NOT_FOUND,
} from '@volontariapp/errors-nest';
import { isBaseError } from '@volontariapp/errors';
import { Neo4jRelationshipRepository } from '../repositories/neo4j-relationship.repository.js';
import type { IRelationshipRepository } from '../repositories/interfaces/relationship.repository.js';
import type { PaginatedIds } from '../entities/paginated-ids.entity.js';

@Injectable()
export class RelationshipService {
  private readonly logger = new Logger({ context: RelationshipService.name });

  constructor(
    @Inject(Neo4jRelationshipRepository)
    private readonly repository: IRelationshipRepository,
  ) {}

  async followUser(followerId: string, followedId: string): Promise<void> {
    try {
      this.logger.log(`Creating follow: ${followerId} -> ${followedId}`);
      if (await this.repository.relationshipExists(followerId, followedId, 'FOLLOW')) {
        throw SOCIAL_RELATIONSHIP_ALREADY_EXISTS(followerId, followedId, 'FOLLOW');
      }
      await this.repository.createFollow(followerId, followedId);
    } catch (error: unknown) {
      if (isBaseError(error)) throw error;
      this.logger.error(`Failed to create follow: ${followerId} -> ${followedId}`, error as Error);
      throw DATABASE_ERROR('creating follow relationship', (error as Error).message);
    }
  }

  async unfollowUser(followerId: string, followedId: string): Promise<void> {
    try {
      this.logger.log(`Deleting follow: ${followerId} -> ${followedId}`);
      if (!(await this.repository.relationshipExists(followerId, followedId, 'FOLLOW'))) {
        throw SOCIAL_RELATIONSHIP_NOT_FOUND(followerId, followedId, 'FOLLOW');
      }
      await this.repository.deleteFollow(followerId, followedId);
    } catch (error: unknown) {
      if (isBaseError(error)) throw error;
      this.logger.error(`Failed to delete follow: ${followerId} -> ${followedId}`, error as Error);
      throw DATABASE_ERROR('deleting follow relationship', (error as Error).message);
    }
  }

  async blockUser(blockerId: string, blockedId: string): Promise<void> {
    try {
      this.logger.log(`Creating block: ${blockerId} -> ${blockedId}`);
      if (await this.repository.relationshipExists(blockerId, blockedId, 'BLOCK')) {
        throw SOCIAL_RELATIONSHIP_ALREADY_EXISTS(blockerId, blockedId, 'BLOCK');
      }
      await this.repository.createBlock(blockerId, blockedId);
    } catch (error: unknown) {
      if (isBaseError(error)) throw error;
      this.logger.error(`Failed to create block: ${blockerId} -> ${blockedId}`, error as Error);
      throw DATABASE_ERROR('creating block relationship', (error as Error).message);
    }
  }

  async unblockUser(blockerId: string, blockedId: string): Promise<void> {
    try {
      this.logger.log(`Deleting block: ${blockerId} -> ${blockedId}`);
      if (!(await this.repository.relationshipExists(blockerId, blockedId, 'BLOCK'))) {
        throw SOCIAL_RELATIONSHIP_NOT_FOUND(blockerId, blockedId, 'BLOCK');
      }
      await this.repository.deleteBlock(blockerId, blockedId);
    } catch (error: unknown) {
      if (isBaseError(error)) throw error;
      this.logger.error(`Failed to delete block: ${blockerId} -> ${blockedId}`, error as Error);
      throw DATABASE_ERROR('deleting block relationship', (error as Error).message);
    }
  }

  async getFollows(userId: string, pagination: PaginationRequest): Promise<PaginatedIds> {
    try {
      return await this.repository.getFollows(userId, pagination);
    } catch (error: unknown) {
      if (isBaseError(error)) throw error;
      this.logger.error(`Failed to get follows for: ${userId}`, error as Error);
      throw DATABASE_ERROR('fetching follows', (error as Error).message);
    }
  }

  async getFollowers(userId: string, pagination: PaginationRequest): Promise<PaginatedIds> {
    try {
      return await this.repository.getFollowers(userId, pagination);
    } catch (error: unknown) {
      if (isBaseError(error)) throw error;
      this.logger.error(`Failed to get followers for: ${userId}`, error as Error);
      throw DATABASE_ERROR('fetching followers', (error as Error).message);
    }
  }

  async getBlocks(userId: string, pagination: PaginationRequest): Promise<PaginatedIds> {
    try {
      return await this.repository.getBlocks(userId, pagination);
    } catch (error: unknown) {
      if (isBaseError(error)) throw error;
      this.logger.error(`Failed to get blocks for: ${userId}`, error as Error);
      throw DATABASE_ERROR('fetching blocks', (error as Error).message);
    }
  }

  async getWhoBlockedMe(userId: string, pagination: PaginationRequest): Promise<PaginatedIds> {
    try {
      return await this.repository.getWhoBlockedMe(userId, pagination);
    } catch (error: unknown) {
      if (isBaseError(error)) throw error;
      this.logger.error(`Failed to get who blocked: ${userId}`, error as Error);
      throw DATABASE_ERROR('fetching who blocked me', (error as Error).message);
    }
  }
}
