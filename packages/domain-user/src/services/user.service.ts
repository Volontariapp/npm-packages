import { Inject, Injectable } from '@nestjs/common';
import { Logger } from '@volontariapp/logger';
import { PostgresUserRepository } from '../repositories/postgres-user.repository.js';
import type { IUserRepository } from '../repositories/index.js';
import { UserEntity } from '../entities/user.entity.js';
import { isBaseError } from '@volontariapp/errors';
import { calculateHash } from '@volontariapp/crypto';
import {
  USER_NOT_FOUND,
  USER_ALREADY_HAS_BADGE,
  USER_BADGE_NOT_FOUND,
  INVALID_RNA,
  INVALID_SCORE_INCREMENT,
  DATABASE_ERROR,
} from '@volontariapp/errors-nest';
import { BadgeService } from './badge.service.js';

@Injectable()
export class UserService {
  private readonly logger = new Logger({ context: UserService.name });

  constructor(
    @Inject(PostgresUserRepository)
    private readonly userRepository: IUserRepository,
    private readonly badgeService: BadgeService,
  ) {}

  async findById(id: string): Promise<UserEntity> {
    try {
      const user = await this.userRepository.findById(id);
      if (!user) {
        this.logger.warn(`User with id ${id} not found`);
        throw USER_NOT_FOUND(id);
      }
      return user;
    } catch (error) {
      if (isBaseError(error)) throw error;
      const err = error as Error;
      this.logger.error(`Error while finding user by id ${id}: ${err.message}`);
      throw DATABASE_ERROR(`finding user by id ${id}`, err.message);
    }
  }

  async findByEmail(email: string): Promise<UserEntity> {
    try {
      const user = await this.userRepository.findByEmail(email);
      if (!user) {
        this.logger.warn(`User with email hash ${calculateHash(email).slice(0, 8)} not found`);
        throw USER_NOT_FOUND(email, 'email');
      }
      return user;
    } catch (error) {
      if (isBaseError(error)) throw error;
      const err = error as Error;
      this.logger.error(
        `Error while finding user by email hash ${calculateHash(email).slice(0, 8)}: ${err.message}`,
      );
      throw DATABASE_ERROR(`finding user by email ${email}`, err.message);
    }
  }

  async findByRna(rna: string): Promise<UserEntity> {
    try {
      const user = await this.userRepository.findByRna(rna);
      if (!user) {
        this.logger.warn(`User with rna ${rna} not found`);
        throw USER_NOT_FOUND(rna, 'rna');
      }
      return user;
    } catch (error) {
      if (isBaseError(error)) throw error;
      const err = error as Error;
      this.logger.error(`Error while finding user by rna ${rna}: ${err.message}`);
      throw DATABASE_ERROR(`finding user by rna ${rna}`, err.message);
    }
  }

  async findAll(limit?: number, offset?: number): Promise<[UserEntity[], number]> {
    try {
      return await this.userRepository.findAll(limit, offset);
    } catch (error) {
      if (isBaseError(error)) throw error;
      const err = error as Error;
      this.logger.error(`Error while finding all users: ${err.message}`);
      throw DATABASE_ERROR('finding all users', err.message);
    }
  }

  async update(id: string, data: Partial<UserEntity>): Promise<UserEntity> {
    try {
      if (data.rna != null && !UserEntity.isValidRna(data.rna)) {
        this.logger.warn(`Invalid RNA ${data.rna} for user update with id ${id}`);
        throw INVALID_RNA(data.rna);
      }
      const updatedUser = await this.userRepository.update(id, data);
      if (!updatedUser) {
        this.logger.warn(`User with id ${id} not found for update`);
        throw USER_NOT_FOUND(id);
      }
      return updatedUser;
    } catch (error) {
      if (isBaseError(error)) throw error;
      const err = error as Error;
      this.logger.error(`Error while updating user with id ${id}: ${err.message}`);
      throw DATABASE_ERROR(`updating user with id ${id}`, err.message);
    }
  }

  async delete(id: string): Promise<void> {
    try {
      const deleted = await this.userRepository.delete(id);
      if (!deleted) {
        this.logger.warn(`User with id ${id} not found for deletion`);
        throw USER_NOT_FOUND(id);
      }
    } catch (error) {
      if (isBaseError(error)) throw error;
      const err = error as Error;
      this.logger.error(`Error while deleting user with id ${id}: ${err.message}`);
      throw DATABASE_ERROR(`deleting user with id ${id}`, err.message);
    }
  }

  async addBadgeToUser(userId: string, badgeId: string): Promise<void> {
    try {
      const user = await this.findById(userId);
      await this.badgeService.findById(badgeId);

      if (user.badges.some((b) => b.id === badgeId)) {
        this.logger.warn(`User with id ${userId} already has badge with id ${badgeId}`);
        throw USER_ALREADY_HAS_BADGE(userId, badgeId);
      }

      await this.userRepository.addBadgeToUser(userId, badgeId);
    } catch (error) {
      if (isBaseError(error)) throw error;
      const err = error as Error;
      this.logger.error(`Error while adding badge ${badgeId} to user ${userId}: ${err.message}`);
      throw DATABASE_ERROR(`adding badge ${badgeId} to user ${userId}`, err.message);
    }
  }

  async removeBadgeFromUser(userId: string, badgeId: string): Promise<void> {
    try {
      const user = await this.findById(userId);

      if (!user.badges.some((badge) => badge.id === badgeId)) {
        this.logger.warn(
          `User with id ${userId} does not have badge with id ${badgeId} for removal`,
        );
        throw USER_BADGE_NOT_FOUND(userId, badgeId);
      }

      await this.userRepository.removeBadgeFromUser(userId, badgeId);
    } catch (error) {
      if (isBaseError(error)) throw error;
      const err = error as Error;
      this.logger.error(
        `Error while removing badge ${badgeId} from user ${userId}: ${err.message}`,
      );
      throw DATABASE_ERROR(`removing badge ${badgeId} from user ${userId}`, err.message);
    }
  }

  async incrementImpactScore(userId: string, score: number): Promise<void> {
    try {
      if (score <= 0) {
        this.logger.warn(`Invalid score increment of ${score.toString()} for user ${userId}`);
        throw INVALID_SCORE_INCREMENT(score);
      }
      await this.userRepository.incrementImpactScore(userId, score);
    } catch (error) {
      if (isBaseError(error)) throw error;
      const err = error as Error;
      this.logger.error(
        `Error while incrementing impact score of user ${userId} by ${score.toString()}: ${err.message}`,
      );
      throw DATABASE_ERROR(
        `incrementing impact score of user ${userId} by ${score.toString()}`,
        err.message,
      );
    }
  }
}
