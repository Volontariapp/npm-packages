import { Inject, Injectable } from '@nestjs/common';
import { Logger } from '@volontariapp/logger';
import * as repositories from '../repositories/index.js';
import { UserEntity } from '../entities/user.entity.js';
import {
  DATABASE_ERROR,
  INVALID_RNA,
  USER_ALREADY_EXISTS,
  USER_NOT_FOUND,
} from '@volontariapp/errors-nest';
import { hashPassword, verifyPassword, calculateHash } from '@volontariapp/crypto';
import { isBaseError, isDatabaseDriverError } from '@volontariapp/errors';
import { JwtService } from '@volontariapp/auth';

export interface SignUpData {
  email: string;
  pseudo: string;
  password: string;
  organisationInfo?: {
    rna: string;
  };
  bio?: string;
  logoPath?: string;
}

export interface LoginData {
  email: string;
  password: string;
}

export type AuthResult = {
  accessToken: string;
  refreshToken: string;
};

@Injectable()
export class AuthService {
  private readonly logger = new Logger({ context: AuthService.name });

  constructor(
    @Inject(repositories.PostgresUserRepository)
    private readonly userRepository: repositories.IUserRepository,
    private readonly jwtService: JwtService,
  ) {}

  async signUp(command: SignUpData): Promise<AuthResult> {
    const existingUser = await this.userRepository.findByEmail(command.email);
    if (existingUser) {
      this.logger.warn(
        `Attempt to sign up with already registered email hash: ${calculateHash(command.email).slice(0, 8)}`,
      );
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
      const userEntity = await this.userRepository.createWithHashedPassword(user, hashedPassword);
      const authUser = { id: userEntity.id, email: userEntity.email, role: userEntity.role };
      const [accessToken, refreshToken] = await Promise.all([
        this.jwtService.signAccessToken(authUser),
        this.jwtService.signRefreshToken(authUser),
      ]);
      return { accessToken, refreshToken };
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

  async logIn(command: LoginData): Promise<AuthResult> {
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
    const authUser = { id: user.id, email: user.email, role: user.role };
    const [accessToken, refreshToken] = await Promise.all([
      this.jwtService.signAccessToken(authUser),
      this.jwtService.signRefreshToken(authUser),
    ]);
    return { accessToken, refreshToken };
  }
}
