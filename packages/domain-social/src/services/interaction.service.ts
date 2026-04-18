import { Injectable, Inject } from '@nestjs/common';
import { Logger } from '@volontariapp/logger';
import type { PaginationRequest } from '@volontariapp/contracts';
import { DATABASE_ERROR } from '@volontariapp/errors-nest';
import { isBaseError } from '@volontariapp/errors';
import { Neo4jInteractionRepository } from '../repositories/neo4j-interaction.repository.js';
import type { IInteractionRepository } from '../repositories/interfaces/interaction.repository.js';
import type { PaginatedIds } from '../entities/paginated-ids.entity.js';

@Injectable()
export class InteractionService {
  private readonly logger = new Logger({ context: InteractionService.name });

  constructor(
    @Inject(Neo4jInteractionRepository)
    private readonly repository: IInteractionRepository,
  ) {}

  async likePost(userId: string, postId: string): Promise<void> {
    try {
      this.logger.log(`Creating like: user ${userId} -> post ${postId}`);
      await this.repository.createLike(userId, postId);
    } catch (error: unknown) {
      if (isBaseError(error)) throw error;
      this.logger.error(`Failed to create like: ${userId} -> ${postId}`, error as Error);
      throw DATABASE_ERROR('creating like relationship', (error as Error).message);
    }
  }

  async unlikePost(userId: string, postId: string): Promise<void> {
    try {
      this.logger.log(`Deleting like: user ${userId} -> post ${postId}`);
      await this.repository.deleteLike(userId, postId);
    } catch (error: unknown) {
      if (isBaseError(error)) throw error;
      this.logger.error(`Failed to delete like: ${userId} -> ${postId}`, error as Error);
      throw DATABASE_ERROR('deleting like relationship', (error as Error).message);
    }
  }

  async getUserLikes(userId: string, pagination: PaginationRequest): Promise<PaginatedIds> {
    try {
      return await this.repository.getUserLikes(userId, pagination);
    } catch (error: unknown) {
      if (isBaseError(error)) throw error;
      this.logger.error(`Failed to get likes for user: ${userId}`, error as Error);
      throw DATABASE_ERROR('fetching user likes', (error as Error).message);
    }
  }

  async getPostLikers(postId: string, pagination: PaginationRequest): Promise<PaginatedIds> {
    try {
      return await this.repository.getPostLikers(postId, pagination);
    } catch (error: unknown) {
      if (isBaseError(error)) throw error;
      this.logger.error(`Failed to get likers for post: ${postId}`, error as Error);
      throw DATABASE_ERROR('fetching post likers', (error as Error).message);
    }
  }
}
