import { Inject, Injectable } from '@nestjs/common';
import { Logger } from '@volontariapp/logger';
import * as repositories from '../repositories/index.js';
import { UserEntity } from '../entities/user.entity.js';
import { LoginCommand, SignUpCommand } from '@volontariapp/contracts';
import {
  DATABASE_ERROR,
  INVALID_RNA,
  USER_ALREADY_EXISTS,
  USER_NOT_FOUND,
} from '@volontariapp/errors-nest';
import { hashPassword, verifyPassword } from '@volontariapp/crypto';
import { isBaseError, isDatabaseDriverError } from '@volontariapp/errors';

@Injectable()
export class AuthService {
  private readonly logger = new Logger({ context: AuthService.name });

  constructor(
    @Inject(repositories.PostgresUserRepository)
    private readonly userRepository: repositories.IUserRepository,
  ) {}

  async signUp(command: SignUpCommand): Promise<UserEntity> {
    const existingUser = await this.userRepository.findByEmail(command.email);
    if (existingUser) {
      this.logger.warn(`Attempt to sign up with already registered email: ${command.email}`);
      throw USER_ALREADY_EXISTS(command.email);
    }
    const user = UserEntity.create({
      email: command.email,
      pseudo: command.pseudo,
      rna: command.organisationInfo?.rna,
      bio: command.bio,
      logoPath: command.logoPath,
    });
    const hashedPassword = hashPassword(command.password);
    try {
      if (user.rna != null && !UserEntity.isValidRna(user.rna)) {
        this.logger.warn(`Invalid RNA ${user.rna} for new user`);
        throw INVALID_RNA(user.rna);
      }
      return await this.userRepository.createWithHashedPassword(user, hashedPassword);
    } catch (error) {
      if (isBaseError(error)) throw error;

      if (isDatabaseDriverError(error) && error.code === '23505') {
        throw USER_ALREADY_EXISTS(user.email);
      }

      const err = error as Error;
      this.logger.error(`Error while creating user: ${err.message}`);
      throw DATABASE_ERROR('creating user', err.message);
    }
  }

  async logIn(command: LoginCommand): Promise<UserEntity> {
    const user = await this.userRepository.findByEmail(command.email);
    if (!user) {
      this.logger.warn(`Login attempt with non-existent email: ${command.email}`);
      throw USER_NOT_FOUND(command.email, 'email');
    }
    const passwordHash = await this.userRepository.findPasswordHashByEmail(command.email);
    if (passwordHash == null || !verifyPassword(command.password, passwordHash)) {
      this.logger.warn(`Invalid password attempt for email: ${command.email}`);
      throw USER_NOT_FOUND(command.email, 'email');
    }
    return user;
  }
}
