import 'reflect-metadata';
import { jest, describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import { UserService } from '../../services/user.service.js';
import type { IUserRepository } from '../../repositories/interfaces/user.repository.js';
import { UserFactory } from '../__test-utils__/factories/user.factory.js';
import { createUserRepositoryMock } from '../__test-utils__/mocks/user.repository.mock.js';
import { UserId, UpdateUserInput } from '../../value-objects/index.js';
import type { BadgeService } from '../../services/badge.service.js';
import { Logger } from '@volontariapp/logger';

describe('User Avatar Replacement (Unit)', () => {
  let service: UserService;
  let mockRepository: jest.Mocked<IUserRepository>;
  let mockBadgeService: jest.Mocked<Pick<BadgeService, 'findById'>>;
  let loggerWarnSpy: ReturnType<typeof jest.spyOn>;

  beforeEach(() => {
    mockRepository = createUserRepositoryMock();
    mockBadgeService = { findById: jest.fn() };
    service = new UserService(mockRepository, mockBadgeService as unknown as BadgeService);
    loggerWarnSpy = jest.spyOn(Logger.prototype, 'warn').mockImplementation(() => undefined);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('updateAvatar()', () => {
    it('should update avatar and return user entity', async () => {
      const user = UserFactory.build({
        id: 'user-1',
        avatarFileId: 'new-file-uuid',
      });
      const updateAvatarSpy = jest.spyOn(mockRepository, 'updateAvatar').mockResolvedValue(user);

      const result = await service.updateAvatar(new UserId('user-1'), 'new-file-uuid');

      expect(updateAvatarSpy).toHaveBeenCalledWith('user-1', 'new-file-uuid');
      expect(result.avatarFileId).toBe('new-file-uuid');
    });

    it('should throw NOT_FOUND when user does not exist', async () => {
      const updateAvatarSpy = jest.spyOn(mockRepository, 'updateAvatar').mockResolvedValue(null);

      await expect(
        service.updateAvatar(new UserId('unknown-user'), 'file-uuid'),
      ).rejects.toMatchObject({
        code: 'NOT_FOUND',
      });
      expect(updateAvatarSpy).toHaveBeenCalledWith('unknown-user', 'file-uuid');
      expect(loggerWarnSpy).toHaveBeenCalled();
    });
  });

  describe('update() with avatarFileId', () => {
    it('should forward avatarFileId to repository update', async () => {
      const user = UserFactory.build({
        id: 'user-1',
        avatarFileId: 'avatar-uuid',
        pseudo: 'newpseudo',
      });
      const updateSpy = jest.spyOn(mockRepository, 'update').mockResolvedValue(user);

      const result = await service.update(
        new UserId('user-1'),
        new UpdateUserInput({
          pseudo: 'newpseudo',
          avatarFileId: 'avatar-uuid',
        }),
      );

      expect(updateSpy).toHaveBeenCalledWith('user-1', {
        pseudo: 'newpseudo',
        bio: undefined,
        avatarFileId: 'avatar-uuid',
        rna: undefined,
        passwordHash: undefined,
      });
      expect(result.avatarFileId).toBe('avatar-uuid');
    });
  });
});
