import { Inject, Injectable } from '@nestjs/common';
import { Logger } from '@volontariapp/logger';
import { PostgresUserRepository } from '../repositories/postgres-user.repository.js';
import type { IUserRepository } from '../repositories/index.js';
import { UserEntity } from '../entities/user.entity.js';
import { isBaseError } from '@volontariapp/errors';

@Injectable()
export class UserService {
  private readonly logger = new Logger({ context: UserService.name });

  constructor(
    @Inject(PostgresUserRepository)
    private readonly userRepository: IUserRepository,
  ) {}

  async findById(id: string) : Promise<UserEntity> {
    try {
      const user = await this.userRepository.findById(id);
      if (!user) {
        this.logger.warn(`User with id ${id} not found`);
        throw new Error('User not found');
      }
      return user;
    }
    catch (error) {
      if (isBaseError(error)) throw error;
      const err = error as Error;
      this.logger.error(`Error while finding user by id ${id}: ${err.message}`);
      throw new Error('Error while finding user');
    }
  }

  async findByEmail(email: string) : Promise<UserEntity> {
    try {
      const user = await this.userRepository.findByEmail(email);
      if (!user) {
        this.logger.warn(`User with email ${email} not found`);
        throw new Error('User not found');
      }
      return user;
    }
    catch (error) {
      if (isBaseError(error)) throw error;
      const err = error as Error;
      this.logger.error(`Error while finding user by email ${email}: ${err.message}`);
      throw new Error('Error while finding user');
    }
  }

  async findByRna(rna: string) : Promise<UserEntity> {
    try {
      const user = await this.userRepository.findByRna(rna);
      if (!user) {
        this.logger.warn(`User with rna ${rna} not found`);
        throw new Error('User not found');
      }
      return user;
    }
    catch (error) {
      if (isBaseError(error)) throw error;
      const err = error as Error;
      this.logger.error(`Error while finding user by rna ${rna}: ${err.message}`);
      throw new Error('Error while finding user');
    }
  }

  async findAll(limit?: number, offset?: number) : Promise<[UserEntity[], number]> {
    try {
      return await this.userRepository.findAll(limit, offset);
    }
    catch (error) {
      if (isBaseError(error)) throw error;
      const err = error as Error;
      this.logger.error(`Error while finding all users: ${err.message}`);
      throw new Error('Error while finding users');
    }
  }

  async create(user: Partial<UserEntity>) : Promise<UserEntity> {
    try {
      return await this.userRepository.create(user);
    }
    catch (error) {
      if (isBaseError(error)) throw error;
      const err = error as Error;
      this.logger.error(`Error while creating user: ${err.message}`);
      throw new Error('Error while creating user');
    }
  }

  async update(id: string, data: Partial<UserEntity>) : Promise<UserEntity> {
    try {
      const updatedUser = await this.userRepository.update(id, data);
      if (!updatedUser) {
        this.logger.warn(`User with id ${id} not found for update`);
        throw new Error('User not found');
      }
      return updatedUser;
    }
    catch (error) {
      if (isBaseError(error)) throw error;
      const err = error as Error;
      this.logger.error(`Error while updating user with id ${id}: ${err.message}`);
      throw new Error('Error while updating user');
    }
  }

  async delete(id: string) : Promise<void> {
    try {
      const deleted = await this.userRepository.delete(id);
      if (!deleted) {
        this.logger.warn(`User with id ${id} not found for deletion`);
        throw new Error('User not found');
      }
    }
    catch (error) {
      if (isBaseError(error)) throw error;
      const err = error as Error;
      this.logger.error(`Error while deleting user with id ${id}: ${err.message}`);
      throw new Error('Error while deleting user');
    }
  }

  async addBadgeToUser(userId: string, badgeId: string) : Promise<void> {
    try {
      await this.userRepository.addBadgeToUser(userId, badgeId);
    }
    catch (error) {
      if (isBaseError(error)) throw error;
      const err = error as Error;
      this.logger.error(`Error while adding badge ${badgeId} to user ${userId}: ${err.message}`);
      throw new Error('Error while adding badge to user');
    }
  }

  async removeBadgeFromUser(userId: string, badgeId: string) : Promise<void> {
    try {
      await this.userRepository.removeBadgeFromUser(userId, badgeId);
    }
    catch (error) {
      if (isBaseError(error)) throw error;
      const err = error as Error;
      this.logger.error(`Error while removing badge ${badgeId} from user ${userId}: ${err.message}`);
      throw new Error('Error while removing badge from user');
    }
  }

  async incrementImpactScore(userId: string, score: number) : Promise<void> {
    try {
      await this.userRepository.incrementImpactScore(userId, score);
    }
    catch (error) {
      if (isBaseError(error)) throw error;
      const err = error as Error;
      this.logger.error(`Error while incrementing impact score of user ${userId} by ${score.toString()}: ${err.message}`);
      throw new Error('Error while incrementing impact score');
    }
  }
}
