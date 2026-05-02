import 'reflect-metadata';
import { jest, describe, it, expect, beforeAll, afterAll, beforeEach } from '@jest/globals';
import { initializeTestDb, closeTestDb, truncateAll, getTestRepository } from '../data-source.js';
import { UserModel } from '../../models/user.model.js';
import { PostgresUserRepository } from '../../repositories/postgres-user.repository.js';
import { AuthService } from '../../services/auth.service.js';
import { UserFactory } from '../__test-utils__/factories/user.factory.js';
import { CommandsFactory } from '../__test-utils__/factories/commands.factory.js';
import type { JwtService } from '@volontariapp/auth';
import { UserRoles } from '@volontariapp/shared';
import { hashPassword } from '@volontariapp/crypto';

describe('AuthService (Integration)', () => {
  let authService: AuthService;
  let userRepository: PostgresUserRepository;
  let jwtServiceMock: jest.Mocked<JwtService>;

  beforeAll(async () => {
    await initializeTestDb();

    userRepository = new PostgresUserRepository(
      getTestRepository(UserModel),
      'test-email-encryption-secret-32ch',
    );

    jwtServiceMock = {
      signAccessToken: jest.fn<JwtService['signAccessToken']>().mockResolvedValue('access-token'),
      signRefreshToken: jest
        .fn<JwtService['signRefreshToken']>()
        .mockResolvedValue('refresh-token'),
      verifyRefreshToken: jest.fn<JwtService['verifyRefreshToken']>(),
    } as unknown as jest.Mocked<JwtService>;

    authService = new AuthService(userRepository, jwtServiceMock);
  });

  afterAll(async () => {
    await closeTestDb();
  });

  beforeEach(async () => {
    await truncateAll();
    jest.clearAllMocks();
  });

  describe('createAdmin()', () => {
    it('should create an admin user in the database and return tokens', async () => {
      // ARRANGE
      const command = CommandsFactory.buildSignUpCommand({
        email: 'admin@integration.com',
        password: 'AdminPassword123!',
      });

      // ACT
      const result = await authService.createAdmin(command);

      // ASSERT
      expect(result.user.email).toBe('admin@integration.com');
      expect(result.user.role).toBe(UserRoles.ADMIN);
      expect(result.auth.accessToken).toBe('access-token');

      // Verify in DB
      const dbUser = await userRepository.findByEmail('admin@integration.com');
      expect(dbUser).toBeDefined();
      expect(dbUser?.role).toBe(UserRoles.ADMIN);
    });
  });

  describe('grantAdmin()', () => {
    it('should update an existing user to admin role', async () => {
      // ARRANGE
      const email = 'volunteer@integration.com';
      const user = await userRepository.createWithHashedPassword(
        UserFactory.build({ email, role: UserRoles.VOLUNTEER }),
        hashPassword('password123'),
      );

      // ACT
      const result = await authService.grantAdmin(user.id);

      // ASSERT
      expect(result.accessToken).toBe('access-token');

      // Verify in DB
      const updatedUser = await userRepository.findById(user.id);
      expect(updatedUser?.role).toBe(UserRoles.ADMIN);
    });

    it('should throw NOT_FOUND if user does not exist', async () => {
      // ARRANGE
      const nonExistentId = '00000000-0000-0000-0000-000000000000';

      // ACT & ASSERT
      await expect(authService.grantAdmin(nonExistentId)).rejects.toMatchObject({
        code: 'NOT_FOUND',
      });
    });
  });

  describe('refreshTokens()', () => {
    it('should return new tokens for a valid refresh token', async () => {
      // ARRANGE
      const email = 'refresh@integration.com';
      const user = await userRepository.createWithHashedPassword(
        UserFactory.build({ email, role: UserRoles.VOLUNTEER }),
        hashPassword('password123'),
      );

      jwtServiceMock.verifyRefreshToken.mockResolvedValue({ id: user.id, role: user.role });
      const command = CommandsFactory.buildRefreshTokensCommand({
        refreshToken: 'valid-refresh-token',
      });

      // ACT
      const result = await authService.refreshTokens(command);

      // ASSERT
      expect(result.accessToken).toBe('access-token');
      expect(result.refreshToken).toBe('refresh-token');
      expect(jwtServiceMock.verifyRefreshToken).toHaveBeenCalledWith('valid-refresh-token');
    });
  });
});
