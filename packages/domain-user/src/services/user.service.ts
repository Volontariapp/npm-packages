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
import {
  UserId,
  UserEmail,
  UserRna,
  UpdateUserInput,
  PaginationInput,
  UserListResult,
  ImpactScore,
} from '../value-objects/index.js';
import { BadgeId } from '../value-objects/index.js';

export {
  UserId,
  UserEmail,
  UserRna,
  UpdateUserInput,
  PaginationInput,
  UserListResult,
  ImpactScore,
};

@Injectable()
export class UserService {
  private readonly logger = new Logger({ context: UserService.name });

  constructor(
    @Inject(PostgresUserRepository)
    private readonly userRepository: IUserRepository,
    private readonly badgeService: BadgeService,
  ) {}

  async findById(id: UserId): Promise<UserEntity> {
    try {
      const user = await this.userRepository.findById(id.value);
      if (!user) {
        this.logger.warn(`User with id ${id.value} not found`);
        throw USER_NOT_FOUND(id.value);
      }
      return user;
    } catch (error) {
      if (isBaseError(error)) throw error;
      const err = error as Error;
      this.logger.error(`Error while finding user by id ${id.value}: ${err.message}`);
      throw DATABASE_ERROR(`finding user by id ${id.value}`, err.message);
    }
  }

  async findByEmail(email: UserEmail): Promise<UserEntity> {
    try {
      const user = await this.userRepository.findByEmail(email.value);
      if (!user) {
        this.logger.warn(
          `User with email hash ${calculateHash(email.value).slice(0, 8)} not found`,
        );
        throw USER_NOT_FOUND(email.value, 'email');
      }
      return user;
    } catch (error) {
      if (isBaseError(error)) throw error;
      const err = error as Error;
      this.logger.error(
        `Error while finding user by email hash ${calculateHash(email.value).slice(0, 8)}: ${err.message}`,
      );
      throw DATABASE_ERROR(`finding user by email ${email.value}`, err.message);
    }
  }

  async findByRna(rna: UserRna): Promise<UserEntity> {
    try {
      const user = await this.userRepository.findByRna(rna.value);
      if (!user) {
        this.logger.warn(`User with rna ${rna.value} not found`);
        throw USER_NOT_FOUND(rna.value, 'rna');
      }
      return user;
    } catch (error) {
      if (isBaseError(error)) throw error;
      const err = error as Error;
      this.logger.error(`Error while finding user by rna ${rna.value}: ${err.message}`);
      throw DATABASE_ERROR(`finding user by rna ${rna.value}`, err.message);
    }
  }

  async findAll(pagination?: PaginationInput): Promise<UserListResult> {
    try {
      const [users, total] = await this.userRepository.findAll(
        pagination?.limit,
        pagination?.offset,
      );
      return new UserListResult(users, total);
    } catch (error) {
      if (isBaseError(error)) throw error;
      const err = error as Error;
      this.logger.error(`Error while finding all users: ${err.message}`);
      throw DATABASE_ERROR('finding all users', err.message);
    }
  }

  async update(id: UserId, input: UpdateUserInput): Promise<UserEntity> {
    try {
      if (input.rna != null && !UserEntity.isValidRna(input.rna)) {
        this.logger.warn(`Invalid RNA ${input.rna} for user update with id ${id.value}`);
        throw INVALID_RNA(input.rna);
      }
      const updatedUser = await this.userRepository.update(id.value, {
        pseudo: input.pseudo,
        bio: input.bio,
        logoPath: input.logoPath,
        rna: input.rna,
      });
      if (!updatedUser) {
        this.logger.warn(`User with id ${id.value} not found for update`);
        throw USER_NOT_FOUND(id.value);
      }
      return updatedUser;
    } catch (error) {
      if (isBaseError(error)) throw error;
      const err = error as Error;
      this.logger.error(`Error while updating user with id ${id.value}: ${err.message}`);
      throw DATABASE_ERROR(`updating user with id ${id.value}`, err.message);
    }
  }

  async delete(id: UserId): Promise<void> {
    try {
      const deleted = await this.userRepository.delete(id.value);
      if (!deleted) {
        this.logger.warn(`User with id ${id.value} not found for deletion`);
        throw USER_NOT_FOUND(id.value);
      }
    } catch (error) {
      if (isBaseError(error)) throw error;
      const err = error as Error;
      this.logger.error(`Error while deleting user with id ${id.value}: ${err.message}`);
      throw DATABASE_ERROR(`deleting user with id ${id.value}`, err.message);
    }
  }

  async addBadgeToUser(userId: UserId, badgeId: BadgeId): Promise<void> {
    try {
      const user = await this.findById(userId);
      await this.badgeService.findById(badgeId);

      if (user.badges.some((b) => b.id === badgeId.value)) {
        this.logger.warn(`User with id ${userId.value} already has badge with id ${badgeId.value}`);
        throw USER_ALREADY_HAS_BADGE(userId.value, badgeId.value);
      }

      await this.userRepository.addBadgeToUser(userId.value, badgeId.value);
    } catch (error) {
      if (isBaseError(error)) throw error;
      const err = error as Error;
      this.logger.error(
        `Error while adding badge ${badgeId.value} to user ${userId.value}: ${err.message}`,
      );
      throw DATABASE_ERROR(`adding badge ${badgeId.value} to user ${userId.value}`, err.message);
    }
  }

  async removeBadgeFromUser(userId: UserId, badgeId: BadgeId): Promise<void> {
    try {
      const user = await this.findById(userId);

      if (!user.badges.some((badge) => badge.id === badgeId.value)) {
        this.logger.warn(
          `User with id ${userId.value} does not have badge with id ${badgeId.value} for removal`,
        );
        throw USER_BADGE_NOT_FOUND(userId.value, badgeId.value);
      }

      await this.userRepository.removeBadgeFromUser(userId.value, badgeId.value);
    } catch (error) {
      if (isBaseError(error)) throw error;
      const err = error as Error;
      this.logger.error(
        `Error while removing badge ${badgeId.value} from user ${userId.value}: ${err.message}`,
      );
      throw DATABASE_ERROR(
        `removing badge ${badgeId.value} from user ${userId.value}`,
        err.message,
      );
    }
  }

  async incrementImpactScore(userId: UserId, score: ImpactScore): Promise<void> {
    try {
      if (score.value <= 0) {
        this.logger.warn(
          `Invalid score increment of ${score.value.toString()} for user ${userId.value}`,
        );
        throw INVALID_SCORE_INCREMENT(score.value);
      }
      await this.userRepository.incrementImpactScore(userId.value, score.value);
    } catch (error) {
      if (isBaseError(error)) throw error;
      const err = error as Error;
      this.logger.error(
        `Error while incrementing impact score of user ${userId.value} by ${score.value.toString()}: ${err.message}`,
      );
      throw DATABASE_ERROR(
        `incrementing impact score of user ${userId.value} by ${score.value.toString()}`,
        err.message,
      );
    }
  }
}
