import { Injectable, Inject } from '@nestjs/common';
import { Logger } from '@volontariapp/logger';
import type { PaginationRequest } from '@volontariapp/contracts';
import { DATABASE_ERROR } from '@volontariapp/errors-nest';
import { isBaseError } from '@volontariapp/errors';
import { Neo4jPublicationRepository } from '../repositories/neo4j-publication.repository.js';
import type { IPublicationRepository } from '../repositories/interfaces/publication.repository.js';
import type { PaginatedIds } from '../entities/paginated-ids.entity.js';

@Injectable()
export class PublicationService {
  private readonly logger = new Logger({ context: PublicationService.name });

  constructor(
    @Inject(Neo4jPublicationRepository)
    private readonly repository: IPublicationRepository,
  ) {}

  async createPost(postId: string): Promise<void> {
    try {
      this.logger.log(`Creating social post node: ${postId}`);
      await this.repository.createPostNode(postId);
    } catch (error: unknown) {
      if (isBaseError(error)) throw error;
      this.logger.error(`Failed to create social post node: ${postId}`, error as Error);
      throw DATABASE_ERROR('creating social post node', (error as Error).message);
    }
  }

  async deletePost(postId: string): Promise<void> {
    try {
      this.logger.log(`Deleting social post node: ${postId}`);
      await this.repository.deletePostNode(postId);
    } catch (error: unknown) {
      if (isBaseError(error)) throw error;
      this.logger.error(`Failed to delete social post node: ${postId}`, error as Error);
      throw DATABASE_ERROR('deleting social post node', (error as Error).message);
    }
  }

  async getPostExists(postId: string): Promise<boolean> {
    try {
      return await this.repository.postExists(postId);
    } catch (error: unknown) {
      if (isBaseError(error)) throw error;
      this.logger.error(`Failed to check post existence: ${postId}`, error as Error);
      throw DATABASE_ERROR('checking social post existence', (error as Error).message);
    }
  }

  async ownPost(userId: string, postId: string): Promise<void> {
    try {
      this.logger.log(`Creating ownership: user ${userId} owns post ${postId}`);
      await this.repository.createOwnership(userId, postId);
    } catch (error: unknown) {
      if (isBaseError(error)) throw error;
      this.logger.error(`Failed to create ownership: ${userId} -> ${postId}`, error as Error);
      throw DATABASE_ERROR('creating post ownership', (error as Error).message);
    }
  }

  async disownPost(userId: string, postId: string): Promise<void> {
    try {
      this.logger.log(`Deleting ownership: user ${userId} -> post ${postId}`);
      await this.repository.deleteOwnership(userId, postId);
    } catch (error: unknown) {
      if (isBaseError(error)) throw error;
      this.logger.error(`Failed to delete ownership: ${userId} -> ${postId}`, error as Error);
      throw DATABASE_ERROR('deleting post ownership', (error as Error).message);
    }
  }

  async getUserPosts(userId: string, pagination: PaginationRequest): Promise<PaginatedIds> {
    try {
      return await this.repository.getUserPosts(userId, pagination);
    } catch (error: unknown) {
      if (isBaseError(error)) throw error;
      this.logger.error(`Failed to get posts for user: ${userId}`, error as Error);
      throw DATABASE_ERROR('fetching user posts', (error as Error).message);
    }
  }

  async getFeed(userId: string, pagination: PaginationRequest): Promise<PaginatedIds> {
    try {
      return await this.repository.getFeed(userId, pagination);
    } catch (error: unknown) {
      if (isBaseError(error)) throw error;
      this.logger.error(`Failed to get feed for user: ${userId}`, error as Error);
      throw DATABASE_ERROR('fetching user feed', (error as Error).message);
    }
  }
}
