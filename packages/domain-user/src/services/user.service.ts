import { Inject, Injectable } from '@nestjs/common';
import { Logger } from '@volontariapp/logger';
import { PostgresUserRepository } from '../repositories/postgres-user.repository.js';
import type { IUserRepository } from '../repositories/index.js';
import { UserEntity } from '../entities/user.entity.js';
import { isBaseError } from '@volontariapp/errors';
import { calculateHash, verifyPassword, hashPassword } from '@volontariapp/crypto';
import {
  USER_NOT_FOUND,
  USER_ALREADY_HAS_BADGE,
  USER_BADGE_NOT_FOUND,
  INVALID_RNA,
  INVALID_SCORE_INCREMENT,
  DATABASE_ERROR,
  WRONG_PASSWORD,
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

  private async db<T>(context: string, fn: () => Promise<T>): Promise<T> {
    try {
      return await fn();
    } catch (error) {
      if (isBaseError(error)) throw error;
      const err = error as Error;
      this.logger.error(`Error while ${context}: ${err.message}`);
      throw DATABASE_ERROR(context, err.message);
    }
  }

  async findById(id: UserId): Promise<UserEntity> {
    const user = await this.db(`finding user by id ${id.value}`, () =>
      this.userRepository.findById(id.value),
    );
    if (!user) {
      this.logger.warn(`User with id ${id.value} not found`);
      throw USER_NOT_FOUND(id.value);
    }
    return user;
  }

  async findByEmail(email: UserEmail): Promise<UserEntity> {
    const emailHash = calculateHash(email.value).slice(0, 8);
    const user = await this.db(`finding user by email hash ${emailHash}`, () =>
      this.userRepository.findByEmail(email.value),
    );
    if (!user) {
      this.logger.warn(`User with email hash ${emailHash} not found`);
      throw USER_NOT_FOUND(email.value, 'email');
    }
    return user;
  }

  async findByRna(rna: UserRna): Promise<UserEntity> {
    const user = await this.db(`finding user by rna ${rna.value}`, () =>
      this.userRepository.findByRna(rna.value),
    );
    if (!user) {
      this.logger.warn(`User with rna ${rna.value} not found`);
      throw USER_NOT_FOUND(rna.value, 'rna');
    }
    return user;
  }

  async findAll(pagination?: PaginationInput): Promise<UserListResult> {
    const [users, total] = await this.db('finding all users', () =>
      this.userRepository.findAll(pagination?.limit, pagination?.offset),
    );
    return new UserListResult(users, total);
  }

  async update(id: UserId, input: UpdateUserInput): Promise<UserEntity> {
    if (input.rna != null && !UserEntity.isValidRna(input.rna)) {
      this.logger.warn(`Invalid RNA ${input.rna} for user update with id ${id.value}`);
      throw INVALID_RNA(input.rna);
    }
    let passwordHash: string | undefined;

    if (input.newPassword != null) {
      if (input.previousPassword == null) {
        throw WRONG_PASSWORD();
      }
      const currentHash = await this.userRepository.findPasswordHashById(id.value);
      if (currentHash == null || !verifyPassword(input.previousPassword, currentHash)) {
        throw WRONG_PASSWORD();
      }
      passwordHash = hashPassword(input.newPassword);
    }

    const updatedUser = await this.db(`updating user with id ${id.value}`, () =>
      this.userRepository.update(id.value, {
        pseudo: input.pseudo,
        bio: input.bio,
        logoPath: input.logoPath,
        rna: input.rna,
        passwordHash,
      }),
    );
    if (!updatedUser) {
      this.logger.warn(`User with id ${id.value} not found for update`);
      throw USER_NOT_FOUND(id.value);
    }
    return updatedUser;
  }

  async delete(id: UserId): Promise<void> {
    const deleted = await this.db(`deleting user with id ${id.value}`, () =>
      this.userRepository.delete(id.value),
    );
    if (!deleted) {
      this.logger.warn(`User with id ${id.value} not found for deletion`);
      throw USER_NOT_FOUND(id.value);
    }
  }

  async addBadgeToUser(userId: UserId, badgeId: BadgeId): Promise<void> {
    const user = await this.findById(userId);
    await this.badgeService.findById(badgeId);

    if (user.badges.some((b) => b.id === badgeId.value)) {
      this.logger.warn(`User with id ${userId.value} already has badge with id ${badgeId.value}`);
      throw USER_ALREADY_HAS_BADGE(userId.value, badgeId.value);
    }

    await this.db(`adding badge ${badgeId.value} to user ${userId.value}`, () =>
      this.userRepository.addBadgeToUser(userId.value, badgeId.value),
    );
  }

  async removeBadgeFromUser(userId: UserId, badgeId: BadgeId): Promise<void> {
    const user = await this.findById(userId);

    if (!user.badges.some((badge) => badge.id === badgeId.value)) {
      this.logger.warn(
        `User with id ${userId.value} does not have badge with id ${badgeId.value} for removal`,
      );
      throw USER_BADGE_NOT_FOUND(userId.value, badgeId.value);
    }

    await this.db(`removing badge ${badgeId.value} from user ${userId.value}`, () =>
      this.userRepository.removeBadgeFromUser(userId.value, badgeId.value),
    );
  }

  async incrementImpactScore(userId: UserId, score: ImpactScore): Promise<void> {
    if (score.value <= 0) {
      this.logger.warn(
        `Invalid score increment of ${score.value.toString()} for user ${userId.value}`,
      );
      throw INVALID_SCORE_INCREMENT(score.value);
    }
    await this.db(
      `incrementing impact score of user ${userId.value} by ${score.value.toString()}`,
      () => this.userRepository.incrementImpactScore(userId.value, score.value),
    );
  }
}
