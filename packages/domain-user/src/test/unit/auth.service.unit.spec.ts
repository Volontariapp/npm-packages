import 'reflect-metadata';
import { jest, describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import { AuthService } from '../../services/auth.service.js';
import { Logger } from '@volontariapp/logger';
import { createUserRepositoryMock } from '../__test-utils__/mocks/user.repository.mock.js';
import { UserFactory } from '../__test-utils__/factories/user.factory.js';
import { CommandsFactory } from '../__test-utils__/factories/commands.factory.js';
import { hashPassword } from '@volontariapp/crypto';
import type { IUserRepository } from '../../repositories/interfaces/user.repository.js';
import type { JwtService } from '@volontariapp/auth';

describe('AuthService (Unit)', () => {
  let service: AuthService;
  let mockRepository: jest.Mocked<IUserRepository>;
  let jwtServiceMock: jest.Mocked<JwtService>;
  let loggerWarnSpy: jest.SpiedFunction<(message: string) => void>;
  let loggerErrorSpy: jest.SpiedFunction<(message: string) => void>;

  beforeEach(() => {
    mockRepository = createUserRepositoryMock();

    jwtServiceMock = {
      signAccessToken: jest.fn<JwtService['signAccessToken']>().mockResolvedValue('access-token'),
      signRefreshToken: jest
        .fn<JwtService['signRefreshToken']>()
        .mockResolvedValue('refresh-token'),
    } as unknown as jest.Mocked<JwtService>;

    service = new AuthService(mockRepository, jwtServiceMock);

    loggerWarnSpy = jest
      .spyOn(Logger.prototype, 'warn')
      .mockImplementation(() => undefined) as never;
    loggerErrorSpy = jest
      .spyOn(Logger.prototype, 'error')
      .mockImplementation(() => undefined) as never;
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  // ───────────────────────────────────────────────────────────────────────────
  // signUp()
  // ───────────────────────────────────────────────────────────────────────────
  describe('signUp()', () => {
    describe('HAPPY PATH: User registered successfully', () => {
      it('should create user and return tokens when valid command provided', async () => {
        // ARRANGE
        const command = CommandsFactory.buildSignUpCommand({
          email: 'neworg@example.com',
          password: 'SecurePass123!',
          pseudo: 'neworg',
        });
        const createdUser = UserFactory.build({
          email: 'neworg@example.com',
          pseudo: 'neworg',
        });
        mockRepository.findByEmail.mockResolvedValue(null);
        mockRepository.createWithHashedPassword.mockResolvedValue(createdUser);

        // ACT
        const result = await service.signUp(command);

        // ASSERT
        expect(result).toEqual({ accessToken: 'access-token', refreshToken: 'refresh-token' });
        expect(mockRepository.findByEmail).toHaveBeenCalledWith('neworg@example.com');
        expect(mockRepository.createWithHashedPassword).toHaveBeenCalledTimes(1);
        expect(jwtServiceMock.signAccessToken).toHaveBeenCalled();
      });

      it('should create organization user when RNA is provided', async () => {
        // ARRANGE
        const command = CommandsFactory.buildSignUpCommand({
          organisationInfo: { rna: 'W123456789' },
        });
        const createdUser = UserFactory.build({ rna: 'W123456789' });
        mockRepository.findByEmail.mockResolvedValue(null);
        mockRepository.createWithHashedPassword.mockResolvedValue(createdUser);

        // ACT
        const result = await service.signUp(command);

        // ASSERT
        expect(result).toEqual({ accessToken: 'access-token', refreshToken: 'refresh-token' });
        expect(createdUser.rna).toBe('W123456789');
        expect(mockRepository.createWithHashedPassword).toHaveBeenCalled();
      });

      it('should create volunteer user when no RNA is provided', async () => {
        // ARRANGE
        const command = CommandsFactory.buildSignUpCommand({
          organisationInfo: undefined,
        });
        const createdUser = UserFactory.build({ rna: undefined });
        mockRepository.findByEmail.mockResolvedValue(null);
        mockRepository.createWithHashedPassword.mockResolvedValue(createdUser);

        // ACT
        const result = await service.signUp(command);

        // ASSERT
        expect(result).toEqual({ accessToken: 'access-token', refreshToken: 'refresh-token' });
        expect(createdUser.rna).toBeUndefined();
        expect(jwtServiceMock.signAccessToken).toHaveBeenCalled();
      });
    });

    describe('SAD PATH: User already exists', () => {
      it('should throw CONFLICT error when email is already registered', async () => {
        // ARRANGE
        const command = CommandsFactory.buildSignUpCommand({ email: 'existing@example.com' });
        const existingUser = UserFactory.build({ email: 'existing@example.com' });
        mockRepository.findByEmail.mockResolvedValue(existingUser);

        // ACT & ASSERT
        await expect(service.signUp(command)).rejects.toMatchObject({
          code: 'CONFLICT',
        });
        expect(loggerWarnSpy).toHaveBeenCalled();
        expect(mockRepository.createWithHashedPassword).not.toHaveBeenCalled();
      });
    });

    describe('SAD PATH: Validation fails', () => {
      it('should throw BAD_REQUEST when RNA format is invalid', async () => {
        // ARRANGE
        const command = CommandsFactory.buildSignUpCommand({
          organisationInfo: { rna: 'INVALID-RNA' },
        });
        mockRepository.findByEmail.mockResolvedValue(null);

        // ACT & ASSERT
        await expect(service.signUp(command)).rejects.toMatchObject({
          code: 'BAD_REQUEST',
        });
        expect(mockRepository.createWithHashedPassword).not.toHaveBeenCalled();
      });

      it('should throw BAD_REQUEST when RNA lacks W prefix', async () => {
        // ARRANGE
        const command = CommandsFactory.buildSignUpCommand({
          organisationInfo: { rna: '123456789' },
        });
        mockRepository.findByEmail.mockResolvedValue(null);

        // ACT & ASSERT
        await expect(service.signUp(command)).rejects.toMatchObject({
          code: 'BAD_REQUEST',
        });
        expect(mockRepository.createWithHashedPassword).not.toHaveBeenCalled();
      });
    });

    describe('ERROR HANDLING: Duplicate email (DB constraint)', () => {
      it('should throw CONFLICT error on unique constraint violation (code 23505)', async () => {
        // ARRANGE
        const command = CommandsFactory.buildSignUpCommand({ email: 'duplicate@example.com' });
        mockRepository.findByEmail.mockResolvedValue(null);
        const dbError = new Error('unique constraint violation');
        Object.defineProperty(dbError, 'code', { value: '23505' });
        mockRepository.createWithHashedPassword.mockRejectedValue(dbError);

        // ACT & ASSERT
        await expect(service.signUp(command)).rejects.toMatchObject({
          code: 'CONFLICT',
        });
      });
    });

    describe('ERROR HANDLING: Database failures', () => {
      it('should throw DATABASE_ERROR on unexpected repository error', async () => {
        // ARRANGE
        const command = CommandsFactory.buildSignUpCommand();
        mockRepository.findByEmail.mockResolvedValue(null);
        mockRepository.createWithHashedPassword.mockRejectedValue(new Error('Connection timeout'));

        // ACT & ASSERT
        await expect(service.signUp(command)).rejects.toMatchObject({
          code: 'DATABASE_ERROR',
        });
        expect(loggerErrorSpy).toHaveBeenCalled();
      });

      it('should log error details when repository fails', async () => {
        // ARRANGE
        const command = CommandsFactory.buildSignUpCommand();
        mockRepository.findByEmail.mockResolvedValue(null);
        const dbError = new Error('Network unreachable');
        mockRepository.createWithHashedPassword.mockRejectedValue(dbError);

        // ACT
        await service.signUp(command).catch(() => {});

        // ASSERT
        expect(loggerErrorSpy).toHaveBeenCalledWith(
          expect.stringContaining('Error while creating user'),
        );
      });
    });
  });

  // ───────────────────────────────────────────────────────────────────────────
  // logIn()
  // ───────────────────────────────────────────────────────────────────────────
  describe('logIn()', () => {
    describe('HAPPY PATH: User authenticated successfully', () => {
      it('should return tokens when credentials are valid', async () => {
        // ARRANGE
        const command = CommandsFactory.buildLoginCommand({
          email: 'user@example.com',
          password: 'CorrectPassword123!',
        });
        const user = UserFactory.build({ email: 'user@example.com' });
        const passwordHash = hashPassword('CorrectPassword123!');
        mockRepository.findByEmail.mockResolvedValue(user);
        mockRepository.findPasswordHashByEmail.mockResolvedValue(passwordHash);

        // ACT
        const result = await service.logIn(command);

        // ASSERT
        expect(result).toEqual({ accessToken: 'access-token', refreshToken: 'refresh-token' });
        expect(mockRepository.findByEmail).toHaveBeenCalledWith('user@example.com');
        expect(mockRepository.findPasswordHashByEmail).toHaveBeenCalledWith('user@example.com');
        expect(jwtServiceMock.signAccessToken).toHaveBeenCalled();
      });
    });

    describe('SAD PATH: User not found', () => {
      it('should throw NOT_FOUND when user does not exist', async () => {
        // ARRANGE
        const command = CommandsFactory.buildLoginCommand({ email: 'nonexistent@example.com' });
        mockRepository.findByEmail.mockResolvedValue(null);

        // ACT & ASSERT
        await expect(service.logIn(command)).rejects.toMatchObject({
          code: 'NOT_FOUND',
        });
        expect(loggerWarnSpy).toHaveBeenCalled();
        expect(mockRepository.findPasswordHashByEmail).not.toHaveBeenCalled();
      });
    });

    describe('SAD PATH: Invalid credentials', () => {
      it('should throw NOT_FOUND when password hash is missing', async () => {
        // ARRANGE
        const command = CommandsFactory.buildLoginCommand({ email: 'user@example.com' });
        const user = UserFactory.build({ email: 'user@example.com' });
        mockRepository.findByEmail.mockResolvedValue(user);
        mockRepository.findPasswordHashByEmail.mockResolvedValue(null);

        // ACT & ASSERT
        await expect(service.logIn(command)).rejects.toMatchObject({
          code: 'NOT_FOUND',
        });
        expect(loggerWarnSpy).toHaveBeenCalledWith(
          expect.stringContaining('Invalid password attempt'),
        );
      });

      it('should throw NOT_FOUND when password is incorrect', async () => {
        // ARRANGE
        const command = CommandsFactory.buildLoginCommand({
          email: 'user@example.com',
          password: 'WrongPassword',
        });
        const user = UserFactory.build({ email: 'user@example.com' });
        const correctPasswordHash = hashPassword('CorrectPassword');
        mockRepository.findByEmail.mockResolvedValue(user);
        mockRepository.findPasswordHashByEmail.mockResolvedValue(correctPasswordHash);

        // ACT & ASSERT
        await expect(service.logIn(command)).rejects.toMatchObject({
          code: 'NOT_FOUND',
        });
        expect(loggerWarnSpy).toHaveBeenCalledWith(
          expect.stringContaining('Invalid password attempt'),
        );
      });

      it('should return same error type for both missing user and wrong password', async () => {
        // ARRANGE
        const nonExistentCommand = CommandsFactory.buildLoginCommand({
          email: 'nonexistent@example.com',
        });
        const wrongPasswordCommand = CommandsFactory.buildLoginCommand({
          email: 'user@example.com',
          password: 'WrongPassword',
        });
        const user = UserFactory.build({ email: 'user@example.com' });
        const correctHash = hashPassword('CorrectPassword');

        // ACT & ASSERT
        mockRepository.findByEmail.mockResolvedValueOnce(null);
        await expect(service.logIn(nonExistentCommand)).rejects.toMatchObject({
          code: 'NOT_FOUND',
        });

        mockRepository.findByEmail.mockResolvedValueOnce(user);
        mockRepository.findPasswordHashByEmail.mockResolvedValue(correctHash);
        await expect(service.logIn(wrongPasswordCommand)).rejects.toMatchObject({
          code: 'NOT_FOUND',
        });
      });
    });

    describe('ERROR HANDLING: Database failures', () => {
      it('should bubble up error when finding user fails', async () => {
        // ARRANGE
        const command = CommandsFactory.buildLoginCommand();
        mockRepository.findByEmail.mockRejectedValue(new Error('Connection failed'));

        // ACT & ASSERT
        await expect(service.logIn(command)).rejects.toThrow('Connection failed');
      });

      it('should bubble up error when finding password hash fails', async () => {
        // ARRANGE
        const command = CommandsFactory.buildLoginCommand();
        const user = UserFactory.build();
        mockRepository.findByEmail.mockResolvedValue(user);
        mockRepository.findPasswordHashByEmail.mockRejectedValue(new Error('DB lost'));

        // ACT & ASSERT
        await expect(service.logIn(command)).rejects.toThrow('DB lost');
      });
    });
  });
});
