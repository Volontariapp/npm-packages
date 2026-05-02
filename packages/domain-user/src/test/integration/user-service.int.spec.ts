import 'reflect-metadata';
import { describe, it, expect, beforeAll, afterAll, beforeEach } from '@jest/globals';
import { initializeTestDb, closeTestDb, truncateAll, getTestRepository } from '../data-source.js';
import { UserModel } from '../../models/user.model.js';
import { BadgeModel } from '../../models/badge.model.js';
import { PostgresUserRepository } from '../../repositories/postgres-user.repository.js';
import { PostgresBadgeRepository } from '../../repositories/postgres-badge.repository.js';
import { UserService } from '../../services/user.service.js';
import { BadgeService } from '../../services/badge.service.js';
import { UserFactory } from '../__test-utils__/factories/user.factory.js';
import { hashPassword, verifyPassword } from '@volontariapp/crypto';
import { UserId } from '../../value-objects/user.vo.js';
import { UpdateUserInput } from '../../value-objects/user.vo.js';
import { WRONG_PASSWORD } from '@volontariapp/errors-nest';

describe('UserService (Integration)', () => {
  let userService: UserService;
  let userRepository: PostgresUserRepository;

  beforeAll(async () => {
    await initializeTestDb();

    userRepository = new PostgresUserRepository(
      getTestRepository(UserModel),
      'test-email-encryption-secret-32ch',
    );
    const badgeRepository = new PostgresBadgeRepository(getTestRepository(BadgeModel));
    const badgeService = new BadgeService(badgeRepository);

    userService = new UserService(userRepository, badgeService);
  });

  afterAll(async () => {
    await closeTestDb();
  });

  beforeEach(async () => {
    await truncateAll();
  });

  describe('update() with password change', () => {
    it('should update password when previous password is correct', async () => {
      // 1. Create a user with a known password
      const initialPassword = 'OldPassword123!';
      const newPassword = 'NewPassword456!';
      const input = UserFactory.buildInput({ email: 'test@example.com' });
      const user = await userRepository.createWithHashedPassword(
        input,
        hashPassword(initialPassword),
      );

      const userId = new UserId(user.id);

      // 2. Update password
      const updateInput = new UpdateUserInput({
        previousPassword: initialPassword,
        newPassword: newPassword,
      });

      await userService.update(userId, updateInput);

      // 3. Verify in DB
      const storedHash = await userRepository.findPasswordHashById(user.id);
      if (storedHash === null) throw new Error('Password hash not found');
      expect(verifyPassword(newPassword, storedHash)).toBe(true);
      expect(verifyPassword(initialPassword, storedHash)).toBe(false);
    });

    it('should throw WRONG_PASSWORD when previous password is incorrect', async () => {
      // 1. Create a user
      const initialPassword = 'CorrectPassword123!';
      const input = UserFactory.buildInput({ email: 'test2@example.com' });
      const user = await userRepository.createWithHashedPassword(
        input,
        hashPassword(initialPassword),
      );

      const userId = new UserId(user.id);

      // 2. Try to update with wrong previous password
      const updateInput = new UpdateUserInput({
        previousPassword: 'WrongPassword!',
        newPassword: 'SomeNewPassword123!',
      });

      await expect(userService.update(userId, updateInput)).rejects.toThrow(
        WRONG_PASSWORD().message,
      );
    });

    it('should not update password if newPassword is not provided', async () => {
      // 1. Create a user
      const initialPassword = 'StayTheSame123!';
      const input = UserFactory.buildInput({ email: 'test3@example.com', pseudo: 'InitialPseudo' });
      const user = await userRepository.createWithHashedPassword(
        input,
        hashPassword(initialPassword),
      );

      const userId = new UserId(user.id);

      // 2. Update only pseudo
      const updateInput = new UpdateUserInput({
        pseudo: 'NewPseudo',
      });

      await userService.update(userId, updateInput);

      // 3. Verify password hasn't changed
      const storedHash = await userRepository.findPasswordHashById(user.id);
      if (storedHash === null) throw new Error('Password hash not found');
      expect(verifyPassword(initialPassword, storedHash)).toBe(true);

      // 4. Verify pseudo was updated
      const updatedUser = await userService.findById(userId);
      expect(updatedUser.pseudo).toBe('NewPseudo');
    });
  });
});
