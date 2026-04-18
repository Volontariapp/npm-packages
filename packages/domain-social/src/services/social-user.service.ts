import { Injectable, Inject } from '@nestjs/common';
import { Logger } from '@volontariapp/logger';
import { DATABASE_ERROR } from '@volontariapp/errors-nest';
import { isBaseError } from '@volontariapp/errors';
import { Neo4jSocialUserRepository } from '../repositories/neo4j-social-user.repository.js';
import type { ISocialUserRepository } from '../repositories/interfaces/social-user.repository.js';

@Injectable()
export class SocialUserService {
  private readonly logger = new Logger({ context: SocialUserService.name });

  constructor(
    @Inject(Neo4jSocialUserRepository)
    private readonly repository: ISocialUserRepository,
  ) {}

  async createUser(userId: string): Promise<void> {
    try {
      this.logger.log(`Creating social user node: ${userId}`);
      await this.repository.createNode(userId);
    } catch (error: unknown) {
      if (isBaseError(error)) throw error;
      this.logger.error(`Failed to create social user node: ${userId}`, error as Error);
      throw DATABASE_ERROR('creating social user node', (error as Error).message);
    }
  }

  async deleteUser(userId: string): Promise<void> {
    try {
      this.logger.log(`Deleting social user node: ${userId}`);
      await this.repository.deleteNode(userId);
    } catch (error: unknown) {
      if (isBaseError(error)) throw error;
      this.logger.error(`Failed to delete social user node: ${userId}`, error as Error);
      throw DATABASE_ERROR('deleting social user node', (error as Error).message);
    }
  }

  async getUserExists(userId: string): Promise<boolean> {
    try {
      return await this.repository.exists(userId);
    } catch (error: unknown) {
      if (isBaseError(error)) throw error;
      this.logger.error(`Failed to check social user existence: ${userId}`, error as Error);
      throw DATABASE_ERROR('checking social user existence', (error as Error).message);
    }
  }
}
