import 'reflect-metadata';
import { jest, describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import { AuthService } from '../../services/auth.service.js';
import { Logger } from '@volontariapp/logger';
import { createUserRepositoryMock } from '../__test-utils__/mocks/user.repository.mock.js';
import { UserFactory } from '../__test-utils__/factories/user.factory.js';
import { CommandsFactory } from '../__test-utils__/factories/commands.factory.js';
import { hashPassword } from '@volontariapp/crypto';
import type { IUserRepository } from '../../repositories/interfaces/user.repository.js';

describe('AuthService (Unit)', () => {
  let service: AuthService;
  let mockRepository: jest.Mocked<IUserRepository>;
  let loggerWarnSpy: ReturnType<typeof jest.spyOn>;
  let loggerErrorSpy: ReturnType<typeof jest.spyOn>;

  beforeEach(() => {
    mockRepository = createUserRepositoryMock();
    service = new AuthService(mockRepository);

    // Spy on logger methods
    loggerWarnSpy = jest.spyOn(Logger.prototype, 'warn').mockImplementation(() => undefined);
    loggerErrorSpy = jest.spyOn(Logger.prototype, 'error').mockImplementation(() => undefined);

    // Reset crypto spies
    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.clearAllMocks();
    // eslint-disable-next-line @typescript-eslint/no-unsafe-call
    loggerWarnSpy.mockRestore();
    // eslint-disable-next-line @typescript-eslint/no-unsafe-call
    loggerErrorSpy.mockRestore();
  });

  // ───────────────────────────────────────────────────────────────────────────
  // signUp()
  // ───────────────────────────────────────────────────────────────────────────
  describe('signUp()', () => {
    describe('HAPPY PATH: User registered successfully', () => {
      it('should create user with valid SignUpCommand', async () => {
        // ▸ ARRANGE
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

        // ▸ ACT
        const result = await service.signUp(command);

        // ▸ ASSERT
        expect(result).toEqual(createdUser);
        expect(result.email).toBe('neworg@example.com');
        expect(mockRepository.findByEmail).toHaveBeenCalledWith('neworg@example.com');
        expect(mockRepository.createWithHashedPassword).toHaveBeenCalledTimes(1);
      });

      it('should create organization user with RNA', async () => {
        // ▸ ARRANGE
        const command = CommandsFactory.buildSignUpCommand({
          organisationInfo: {
            rna: 'W123456789',
          },
        });
        const createdUser = UserFactory.build({
          rna: 'W123456789',
        });
        mockRepository.findByEmail.mockResolvedValue(null);
        mockRepository.createWithHashedPassword.mockResolvedValue(createdUser);

        // ▸ ACT
        const result = await service.signUp(command);

        // ▸ ASSERT
        expect(result).toEqual(createdUser);
        expect(result.rna).toBe('W123456789');
        expect(mockRepository.createWithHashedPassword).toHaveBeenCalled();
      });

      it('should create volunteer user without RNA', async () => {
        // ▸ ARRANGE
        const command = CommandsFactory.buildSignUpCommand({
          organisationInfo: undefined,
        });
        const createdUser = UserFactory.build({ rna: undefined });
        mockRepository.findByEmail.mockResolvedValue(null);
        mockRepository.createWithHashedPassword.mockResolvedValue(createdUser);

        // ▸ ACT
        const result = await service.signUp(command);

        // ▸ ASSERT
        expect(result).toEqual(createdUser);
        expect(result.rna).toBeUndefined();
      });
    });

    describe('SAD PATH: User already exists', () => {
      it('should throw CONFLICT error when email already registered', async () => {
        // ▸ ARRANGE
        const command = CommandsFactory.buildSignUpCommand({
          email: 'existing@example.com',
        });
        const existingUser = UserFactory.build({ email: 'existing@example.com' });
        mockRepository.findByEmail.mockResolvedValue(existingUser);

        // ▸ ACT & ASSERT
        const error = await service.signUp(command).catch((e: unknown) => e);
        expect((error as Record<string, unknown>).code).toBe('CONFLICT');
        expect((error as Record<string, unknown>).message).toContain('existing@example.com');
        expect(loggerWarnSpy).toHaveBeenCalled();
        expect(mockRepository.createWithHashedPassword).not.toHaveBeenCalled();
      });
    });

    describe('SAD PATH: Validation fails', () => {
      it('should throw BAD_REQUEST for invalid RNA format', async () => {
        // ▸ ARRANGE
        const command = CommandsFactory.buildSignUpCommand({
          organisationInfo: {
            rna: 'INVALID-RNA',
          },
        });
        mockRepository.findByEmail.mockResolvedValue(null);

        // ▸ ACT & ASSERT
        const error = await service.signUp(command).catch((e: unknown) => e);
        expect((error as Record<string, unknown>).code).toBe('BAD_REQUEST');
        expect((error as Record<string, unknown>).message).toContain('INVALID-RNA');
        expect(mockRepository.createWithHashedPassword).not.toHaveBeenCalled();
      });

      it('should throw BAD_REQUEST for RNA without W prefix', async () => {
        // ▸ ARRANGE
        const command = CommandsFactory.buildSignUpCommand({
          organisationInfo: {
            rna: '123456789',
          },
        });
        mockRepository.findByEmail.mockResolvedValue(null);

        // ▸ ACT & ASSERT
        const error = await service.signUp(command).catch((e: unknown) => e);
        expect((error as Record<string, unknown>).code).toBe('BAD_REQUEST');
        expect((error as Record<string, unknown>).message).toContain('123456789');
        expect(mockRepository.createWithHashedPassword).not.toHaveBeenCalled();
      });
    });

    describe('ERROR HANDLING: Duplicate email (PostgreSQL constraint)', () => {
      it('should throw CONFLICT error on unique constraint violation (code 23505)', async () => {
        // ▸ ARRANGE
        const command = CommandsFactory.buildSignUpCommand({
          email: 'duplicate@example.com',
        });
        mockRepository.findByEmail.mockResolvedValue(null);
        const dbError = new Error('unique constraint violation') as unknown as Record<
          string,
          unknown
        >;
        dbError.code = '23505';
        mockRepository.createWithHashedPassword.mockRejectedValue(dbError);

        // ▸ ACT & ASSERT
        const error = await service.signUp(command).catch((e: unknown) => e);
        expect((error as Record<string, unknown>).code).toBe('CONFLICT');
        expect((error as Record<string, unknown>).message).toContain('duplicate@example.com');
      });
    });

    describe('ERROR HANDLING: Database failures', () => {
      it('should throw DATABASE_ERROR on unexpected repository error', async () => {
        // ▸ ARRANGE
        const command = CommandsFactory.buildSignUpCommand();
        mockRepository.findByEmail.mockResolvedValue(null);
        mockRepository.createWithHashedPassword.mockRejectedValue(new Error('Connection timeout'));

        // ▸ ACT & ASSERT
        const error = await service.signUp(command).catch((e: unknown) => e);
        expect((error as Record<string, unknown>).code).toBe('DATABASE_ERROR');
        expect((error as Record<string, unknown>).message).toContain('creating user');
        expect(loggerErrorSpy).toHaveBeenCalled();
      });

      it('should log error details when repository fails', async () => {
        // ▸ ARRANGE
        const command = CommandsFactory.buildSignUpCommand();
        mockRepository.findByEmail.mockResolvedValue(null);
        const dbError = new Error('Network unreachable');
        mockRepository.createWithHashedPassword.mockRejectedValue(dbError);

        // ▸ ACT
        try {
          await service.signUp(command);
          // Expected not to throw here
        } catch {
          // Expected
        }

        // ▸ ASSERT
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
      it('should authenticate user with valid credentials', async () => {
        // ▸ ARRANGE
        const command = CommandsFactory.buildLoginCommand({
          email: 'user@example.com',
          password: 'CorrectPassword123!',
        });
        const user = UserFactory.build({ email: 'user@example.com' });
        // Hash the password using the real function
        const passwordHash = hashPassword('CorrectPassword123!');
        mockRepository.findByEmail.mockResolvedValue(user);
        mockRepository.findPasswordHashByEmail.mockResolvedValue(passwordHash);

        // ▸ ACT
        const result = await service.logIn(command);

        // ▸ ASSERT
        expect(result).toEqual(user);
        expect(result.email).toBe('user@example.com');
        expect(mockRepository.findByEmail).toHaveBeenCalledWith('user@example.com');
        expect(mockRepository.findPasswordHashByEmail).toHaveBeenCalledWith('user@example.com');
      });

      it('should return user without logging password hash', async () => {
        // ▸ ARRANGE
        const command = CommandsFactory.buildLoginCommand();
        const user = UserFactory.build({ email: 'user@example.com' });
        const passwordHash = hashPassword(command.password);
        mockRepository.findByEmail.mockResolvedValue(user);
        mockRepository.findPasswordHashByEmail.mockResolvedValue(passwordHash);

        // ▸ ACT
        const result = await service.logIn(command);

        // ▸ ASSERT
        expect(result).toEqual(user);
        // Ensure password hash is not in the returned user
        expect((result as unknown as Record<string, unknown>).passwordHash).toBeUndefined();
      });
    });

    describe('SAD PATH: User not found', () => {
      it('should throw NOT_FOUND when user does not exist', async () => {
        // ▸ ARRANGE
        const command = CommandsFactory.buildLoginCommand({
          email: 'nonexistent@example.com',
        });
        mockRepository.findByEmail.mockResolvedValue(null);

        // ▸ ACT & ASSERT
        const error = await service.logIn(command).catch((e: unknown) => e);
        expect((error as Record<string, unknown>).code).toBe('NOT_FOUND');
        expect((error as Record<string, unknown>).message).toContain('nonexistent@example.com');
        expect(loggerWarnSpy).toHaveBeenCalled();
        expect(mockRepository.findPasswordHashByEmail).not.toHaveBeenCalled();
      });
    });

    describe('SAD PATH: Invalid credentials', () => {
      it('should throw NOT_FOUND when password hash is missing', async () => {
        // ▸ ARRANGE
        const command = CommandsFactory.buildLoginCommand({
          email: 'user@example.com',
          password: 'SomePassword',
        });
        const user = UserFactory.build({ email: 'user@example.com' });
        mockRepository.findByEmail.mockResolvedValue(user);
        mockRepository.findPasswordHashByEmail.mockResolvedValue(null);

        // ▸ ACT & ASSERT
        const error = await service.logIn(command).catch((e: unknown) => e);
        expect((error as Record<string, unknown>).code).toBe('NOT_FOUND');
        expect(loggerWarnSpy).toHaveBeenCalledWith(
          expect.stringContaining('Invalid password attempt'),
        );
      });

      it('should throw NOT_FOUND when password is incorrect', async () => {
        // ▸ ARRANGE
        const correctPassword = 'CorrectPassword123!';
        const wrongPassword = 'WrongPassword';
        const command = CommandsFactory.buildLoginCommand({
          email: 'user@example.com',
          password: wrongPassword,
        });
        const user = UserFactory.build({ email: 'user@example.com' });
        const correctPasswordHash = hashPassword(correctPassword);
        mockRepository.findByEmail.mockResolvedValue(user);
        mockRepository.findPasswordHashByEmail.mockResolvedValue(correctPasswordHash);

        // ▸ ACT & ASSERT
        const error = await service.logIn(command).catch((e: unknown) => e);
        expect((error as Record<string, unknown>).code).toBe('NOT_FOUND');
        expect((error as Record<string, unknown>).message).toContain('user@example.com');
        expect(loggerWarnSpy).toHaveBeenCalledWith(
          expect.stringContaining('Invalid password attempt'),
        );
      });

      it('should not expose whether user exists or password is wrong', async () => {
        // ▸ ARRANGE
        const nonExistentCommand = CommandsFactory.buildLoginCommand({
          email: 'nonexistent@example.com',
        });
        const wrongPasswordCommand = CommandsFactory.buildLoginCommand({
          email: 'user@example.com',
          password: 'WrongPassword',
        });
        const user = UserFactory.build({ email: 'user@example.com' });

        // First scenario: user doesn't exist
        mockRepository.findByEmail.mockResolvedValueOnce(null);
        const nonExistentError = await service.logIn(nonExistentCommand).catch((e: unknown) => e);

        // Second scenario: user exists but password is wrong
        const correctHash = hashPassword('CorrectPassword');
        mockRepository.findByEmail.mockResolvedValueOnce(user);
        mockRepository.findPasswordHashByEmail.mockResolvedValue(correctHash);
        const wrongPasswordError = await service
          .logIn(wrongPasswordCommand)
          .catch((e: unknown) => e);

        // ▸ ASSERT: Both should throw NOT_FOUND with same message pattern
        expect((nonExistentError as Record<string, unknown>).code).toBe('NOT_FOUND');
        expect((wrongPasswordError as Record<string, unknown>).code).toBe('NOT_FOUND');
      });
    });

    describe('ERROR HANDLING: Database failures', () => {
      it('should throw error when finding user by email fails', async () => {
        // ▸ ARRANGE
        const command = CommandsFactory.buildLoginCommand();
        mockRepository.findByEmail.mockRejectedValue(new Error('Connection failed'));

        // ▸ ACT & ASSERT
        await expect(service.logIn(command)).rejects.toThrow();
      });

      it('should throw error when finding password hash fails', async () => {
        // ▸ ARRANGE
        const command = CommandsFactory.buildLoginCommand();
        const user = UserFactory.build();
        mockRepository.findByEmail.mockResolvedValue(user);
        mockRepository.findPasswordHashByEmail.mockRejectedValue(
          new Error('Database connection lost'),
        );

        // ▸ ACT & ASSERT
        await expect(service.logIn(command)).rejects.toThrow();
      });
    });
  });
});
