import { Injectable, Inject } from '@nestjs/common';
import { Logger } from '@volontariapp/logger';
import {
  DATABASE_ERROR,
  SOCIAL_USER_ALREADY_EXISTS,
  SOCIAL_USER_NOT_FOUND,
} from '@volontariapp/errors-nest';
import { isBaseError } from '@volontariapp/errors';
import { Neo4jSocialUserRepository } from '../repositories/neo4j-social-user.repository.js';
import type { ISocialUserRepository } from '../repositories/interfaces/social-user.repository.js';

import { SocialUserMapper } from '../mappers/social-user.mapper.js';
import { UserId } from '../value-objects/ids.vo.js';

@Injectable()
export class SocialUserService {
  private readonly logger = new Logger({ context: SocialUserService.name });

  constructor(
    @Inject(Neo4jSocialUserRepository)
    private readonly repository: ISocialUserRepository,
  ) {}

  async createUser(userId: UserId): Promise<void> {
    const entity = SocialUserMapper.toEntity(userId);
    try {
      this.logger.log(`Creating social user node: ${userId.value}`);
      if (await this.repository.exists(entity)) {
        throw SOCIAL_USER_ALREADY_EXISTS(userId.value);
      }
      await this.repository.createNode(entity);
    } catch (error: unknown) {
      if (isBaseError(error)) throw error;
      this.logger.error(`Failed to create social user node: ${userId.value}`, error as Error);
      throw DATABASE_ERROR('creating social user node', (error as Error).message);
    }
  }

  async deleteUser(userId: UserId): Promise<void> {
    const entity = SocialUserMapper.toEntity(userId);
    try {
      this.logger.log(`Deleting social user node: ${userId.value}`);
      if (!(await this.repository.exists(entity))) {
        throw SOCIAL_USER_NOT_FOUND(userId.value);
      }
      await this.repository.deleteNode(entity);
    } catch (error: unknown) {
      if (isBaseError(error)) throw error;
      this.logger.error(`Failed to delete social user node: ${userId.value}`, error as Error);
      throw DATABASE_ERROR('deleting social user node', (error as Error).message);
    }
  }

  async getUserExists(userId: UserId): Promise<boolean> {
    const entity = SocialUserMapper.toEntity(userId);
    try {
      return await this.repository.exists(entity);
    } catch (error: unknown) {
      if (isBaseError(error)) throw error;
      this.logger.error(`Failed to check social user existence: ${userId.value}`, error as Error);
      throw DATABASE_ERROR('checking social user existence', (error as Error).message);
    }
  }
}
