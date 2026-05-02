import { Inject, Injectable } from '@nestjs/common';
import { Logger } from '@volontariapp/logger';
import { UserEntity } from '../entities/user.entity.js';
import {
  DATABASE_ERROR,
  INVALID_REFRESH_TOKEN,
  INVALID_RNA,
  USER_ALREADY_EXISTS,
  USER_NOT_FOUND,
} from '@volontariapp/errors-nest';
import { hashPassword, verifyPassword, calculateHash } from '@volontariapp/crypto';
import { isBaseError, isDatabaseDriverError } from '@volontariapp/errors';
import { JwtService } from '@volontariapp/auth';
import { UserRoles, type JwtPayload } from '@volontariapp/shared';
import { PostgresUserRepository } from '../repositories/postgres-user.repository.js';
import type { IUserRepository } from '../repositories/interfaces/user.repository.js';
import {
  SignUpInput,
  LoginInput,
  AuthTokens,
  SignUpOutput,
  RefreshTokensInput,
} from '../value-objects/index.js';

export { SignUpInput, LoginInput, AuthTokens };

@Injectable()
export class AuthService {
  private readonly logger = new Logger({ context: AuthService.name });

  constructor(
    @Inject(PostgresUserRepository)
    private readonly userRepository: IUserRepository,
    private readonly jwtService: JwtService,
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

  async signUp(command: SignUpInput): Promise<SignUpOutput> {
    const existingUser = await this.userRepository.findByEmail(command.email);
    if (existingUser) {
      this.logger.warn(
        `Attempt to sign up with already registered email hash: ${calculateHash(command.email).slice(0, 8)}`,
      );
      throw USER_ALREADY_EXISTS(command.email);
    }

    if (command.rna != null && !UserEntity.isValidRna(command.rna)) {
      this.logger.warn(`Invalid RNA ${command.rna} for new user`);
      throw INVALID_RNA(command.rna);
    }

    const user = UserEntity.create({
      email: command.email,
      pseudo: command.pseudo,
      rna: command.rna,
      bio: command.bio,
      logoPath: command.logoPath,
    });
    const hashedPassword = hashPassword(command.password);

    const userEntity: UserEntity = await this.db('creating user', async () => {
      try {
        return await this.userRepository.createWithHashedPassword(user, hashedPassword);
      } catch (error) {
        if (isDatabaseDriverError(error) && error.code === '23505') {
          throw USER_ALREADY_EXISTS(user.email);
        }
        throw error;
      }
    });

    const authUser: JwtPayload = { id: userEntity.id, role: userEntity.role };
    const [accessToken, refreshToken] = await Promise.all([
      this.jwtService.signAccessToken(authUser),
      this.jwtService.signRefreshToken(authUser),
    ]);
    return new SignUpOutput(userEntity, new AuthTokens(accessToken, refreshToken));
  }

  async logIn(command: LoginInput): Promise<AuthTokens> {
    const user = await this.userRepository.findByEmail(command.email);
    if (!user) {
      this.logger.warn(
        `Login attempt with non-existent email hash: ${calculateHash(command.email).slice(0, 8)}`,
      );
      throw USER_NOT_FOUND(command.email, 'email');
    }
    const passwordHash = await this.userRepository.findPasswordHashByEmail(command.email);
    if (passwordHash == null || !verifyPassword(command.password, passwordHash)) {
      this.logger.warn(
        `Invalid password attempt for email hash: ${calculateHash(command.email).slice(0, 8)}`,
      );
      throw USER_NOT_FOUND(command.email, 'email');
    }
    const authUser: JwtPayload = { id: user.id, role: user.role };
    const [accessToken, refreshToken] = await Promise.all([
      this.jwtService.signAccessToken(authUser),
      this.jwtService.signRefreshToken(authUser),
    ]);
    return new AuthTokens(accessToken, refreshToken);
  }

  async refreshTokens(command: RefreshTokensInput): Promise<AuthTokens> {
    try {
      const payload = await this.jwtService.verifyRefreshToken<JwtPayload>(command.refreshToken);
      const authUser: JwtPayload = { id: payload.id, role: payload.role };
      const [accessToken, refreshToken] = await Promise.all([
        this.jwtService.signAccessToken(authUser),
        this.jwtService.signRefreshToken(authUser),
      ]);
      return new AuthTokens(accessToken, refreshToken);
    } catch {
      this.logger.warn(`Invalid refresh token attempt`);
      throw INVALID_REFRESH_TOKEN();
    }
  }

  async createAdmin(command: SignUpInput): Promise<SignUpOutput> {
    const existingUser = await this.userRepository.findByEmail(command.email);
    if (existingUser) {
      this.logger.warn(
        `Attempt to create admin with already registered email hash: ${calculateHash(command.email).slice(0, 8)}`,
      );
      throw USER_ALREADY_EXISTS(command.email);
    }

    const user = UserEntity.create({
      email: command.email,
      pseudo: command.pseudo,
      role: UserRoles.ADMIN,
    });
    const hashedPassword = hashPassword(command.password);

    const userEntity: UserEntity = await this.db('creating admin user', async () => {
      try {
        return await this.userRepository.createWithHashedPassword(user, hashedPassword);
      } catch (error) {
        if (isDatabaseDriverError(error) && error.code === '23505') {
          throw USER_ALREADY_EXISTS(user.email);
        }
        throw error;
      }
    });

    const authUser: JwtPayload = {
      id: userEntity.id,
      role: userEntity.role,
    };
    const [accessToken, refreshToken] = await Promise.all([
      this.jwtService.signAccessToken(authUser),
      this.jwtService.signRefreshToken(authUser),
    ]);
    return new SignUpOutput(userEntity, new AuthTokens(accessToken, refreshToken));
  }

  async grantAdmin(userId: string): Promise<AuthTokens> {
    const user = await this.userRepository.findById(userId);
    if (!user) {
      this.logger.warn(`User with id ${userId} not found for admin grant`);
      throw USER_NOT_FOUND(userId);
    }

    const updatedUser = await this.db('granting admin role', async () => {
      const updated = await this.userRepository.update(userId, { role: UserRoles.ADMIN });
      if (!updated) {
        throw USER_NOT_FOUND(userId);
      }
      return updated;
    });

    const authUser: JwtPayload = {
      id: updatedUser.id,
      role: updatedUser.role,
    };
    const [accessToken, refreshToken] = await Promise.all([
      this.jwtService.signAccessToken(authUser),
      this.jwtService.signRefreshToken(authUser),
    ]);
    return new AuthTokens(accessToken, refreshToken);
  }
}
