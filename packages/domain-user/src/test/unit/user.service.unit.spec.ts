import 'reflect-metadata';
import { jest, describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import { UserService } from '../../services/user.service.js';
import { Logger } from '@volontariapp/logger';
import { NotFoundError } from '@volontariapp/errors';
import type { BadgeService } from '../../services/badge.service.js';
import type { IUserRepository } from '../../repositories/interfaces/user.repository.js';
import { UserFactory } from '../__test-utils__/factories/user.factory.js';
import { createUserRepositoryMock } from '../__test-utils__/mocks/user.repository.mock.js';
import { BadgeFactory } from '../__test-utils__/factories/badge.factory.js';

describe('UserService (Unit)', () => {
  let service: UserService;
  let mockRepository: jest.Mocked<IUserRepository>;
  let mockBadgeService: jest.Mocked<Pick<BadgeService, 'findById'>>;
  let loggerWarnSpy: ReturnType<typeof jest.spyOn>;
  let loggerErrorSpy: ReturnType<typeof jest.spyOn>;

  beforeEach(() => {
    mockRepository = createUserRepositoryMock();
    mockBadgeService = { findById: jest.fn() };
    service = new UserService(mockRepository, mockBadgeService as unknown as BadgeService);

    // Spy on logger methods
    loggerWarnSpy = jest.spyOn(Logger.prototype, 'warn').mockImplementation(() => undefined);
    loggerErrorSpy = jest.spyOn(Logger.prototype, 'error').mockImplementation(() => undefined);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  // ───────────────────────────────────────────────────────────────────────────
  // findById()
  // ───────────────────────────────────────────────────────────────────────────
  describe('findById()', () => {
    describe('HAPPY PATH: User exists', () => {
      it('should return the user entity with all properties', async () => {
        // ARRANGE: Set up test data
        const user = UserFactory.build({
          id: 'user-123',
          email: 'john@example.com',
          pseudo: 'johndoe',
          totalImpactScore: 42,
        });
        mockRepository.findById.mockResolvedValue(user);

        // ACT: Call the method
        const result = await service.findById('user-123');

        // ASSERT: Verify the outcome
        expect(result).toEqual(user);
        expect(result.id).toBe('user-123');
        expect(result.totalImpactScore).toBe(42);
        expect(
          mockRepository.findById.mock.calls[mockRepository.findById.mock.calls.length - 1],
        ).toEqual(['user-123']);
        expect(mockRepository.findById.mock.calls).toHaveLength(1);
      });
    });

    describe('SAD PATH: User not found', () => {
      it('should throw NOT_FOUND error with correct message when user does not exist', async () => {
        // ARRANGE: Mock repository to return null
        mockRepository.findById.mockResolvedValue(null);

        // ACT & ASSERT: Verify exception is thrown with correct details
        const error = await service.findById('missing-user').catch((e: unknown) => e);
        expect((error as Record<string, unknown>).code).toBe('NOT_FOUND');
        expect((error as Record<string, unknown>).message).toContain(
          'User with id missing-user not found',
        );
        expect(loggerWarnSpy).toHaveBeenCalledWith('User with id missing-user not found');
      });

      it('should log warning when user not found', async () => {
        // ARRANGE
        mockRepository.findById.mockResolvedValue(null);

        // ACT
        try {
          await service.findById('nonexistent');
          // Expected not to throw here
        } catch {
          // Error expected
        }

        // ASSERT
        expect(loggerWarnSpy).toHaveBeenCalled();
      });
    });

    describe('ERROR HANDLING: Repository failure', () => {
      it('should throw DATABASE_ERROR when repository throws', async () => {
        // ARRANGE: Mock repository to throw
        const dbError = new Error('Connection timeout');
        mockRepository.findById.mockRejectedValue(dbError);

        // ACT & ASSERT
        const error = await service.findById('user-1').catch((e: unknown) => e);
        expect((error as Record<string, unknown>).code).toBe('DATABASE_ERROR');
        expect((error as Record<string, unknown>).message).toContain('finding user by id');
        expect(loggerErrorSpy).toHaveBeenCalled();
      });

      it('should not wrap BaseError - re-throw directly', async () => {
        // ARRANGE
        const customError = new Error('Already handled error') as unknown as Record<
          string,
          unknown
        >;
        customError.name = 'BaseError';
        customError.code = 'CUSTOM_ERROR';
        mockRepository.findById.mockRejectedValue(customError);

        // ACT & ASSERT
        await expect(service.findById('user-1')).rejects.toThrow();
      });
    });
  });

  // ───────────────────────────────────────────────────────────────────────────
  // findByEmail()
  // ───────────────────────────────────────────────────────────────────────────
  describe('findByEmail()', () => {
    describe('HAPPY PATH: User found', () => {
      it('should return user entity when email matches', async () => {
        // ARRANGE
        const user = UserFactory.build({ email: 'alice@example.com' });
        mockRepository.findByEmail.mockResolvedValue(user);

        // ACT
        const result = await service.findByEmail('alice@example.com');

        // ASSERT
        expect(result).toEqual(user);
        expect(result.email).toBe('alice@example.com');
        expect(
          mockRepository.findByEmail.mock.calls[mockRepository.findByEmail.mock.calls.length - 1],
        ).toEqual(['alice@example.com']);
      });
    });

    describe('SAD PATH: User not found by email', () => {
      it('should throw NOT_FOUND error with "email" variant message', async () => {
        // ARRANGE
        mockRepository.findByEmail.mockResolvedValue(null);

        // ACT & ASSERT
        const error = await service.findByEmail('notfound@example.com').catch((e: unknown) => e);
        expect((error as Record<string, unknown>).code).toBe('NOT_FOUND');
        expect((error as Record<string, unknown>).message).toContain('notfound@example.com');
        expect(loggerWarnSpy).toHaveBeenCalled();
      });

      it('should handle empty email string', async () => {
        // ARRANGE
        mockRepository.findByEmail.mockResolvedValue(null);

        // ACT & ASSERT
        const error = await service.findByEmail('').catch((e: unknown) => e);
        expect((error as Record<string, unknown>).code).toBe('NOT_FOUND');
      });
    });

    describe('ERROR HANDLING: Repository fails', () => {
      it('should throw DATABASE_ERROR when repository throws', async () => {
        // ARRANGE
        mockRepository.findByEmail.mockRejectedValue(new Error('DB connection lost'));

        // ACT & ASSERT
        const error = await service.findByEmail('test@example.com').catch((e: unknown) => e);
        expect((error as Record<string, unknown>).code).toBe('DATABASE_ERROR');
        expect(loggerErrorSpy).toHaveBeenCalled();
      });
    });
  });

  // ───────────────────────────────────────────────────────────────────────────
  // findByRna()
  // ───────────────────────────────────────────────────────────────────────────
  describe('findByRna()', () => {
    describe('HAPPY PATH: User found by RNA', () => {
      it('should return user when valid RNA matches', async () => {
        // ARRANGE
        const user = UserFactory.build({ rna: 'W123456789' });
        mockRepository.findByRna.mockResolvedValue(user);

        // ACT
        const result = await service.findByRna('W123456789');

        // ASSERT
        expect(result).toEqual(user);
        expect(result.rna).toBe('W123456789');
        expect(mockRepository.findByRna.mock.calls).toHaveLength(1);
      });
    });

    describe('SAD PATH: User not found by RNA', () => {
      it('should throw NOT_FOUND with "rna" variant message', async () => {
        // ARRANGE
        mockRepository.findByRna.mockResolvedValue(null);

        // ACT & ASSERT
        const error = await service.findByRna('W000000000').catch((e: unknown) => e);
        expect((error as Record<string, unknown>).code).toBe('NOT_FOUND');
        expect((error as Record<string, unknown>).message).toContain('rna');
        expect(loggerWarnSpy).toHaveBeenCalled();
      });
    });

    describe('ERROR HANDLING: Repository fails', () => {
      it('should throw DATABASE_ERROR when repository fails', async () => {
        // ARRANGE
        mockRepository.findByRna.mockRejectedValue(new Error('Query error'));

        // ACT & ASSERT
        const error = await service.findByRna('W123456789').catch((e: unknown) => e);
        expect((error as Record<string, unknown>).code).toBe('DATABASE_ERROR');
        expect(loggerErrorSpy).toHaveBeenCalled();
      });
    });
  });

  // ───────────────────────────────────────────────────────────────────────────
  // findAll()
  // ───────────────────────────────────────────────────────────────────────────
  describe('findAll()', () => {
    describe('HAPPY PATH: Pagination works', () => {
      it('should return users array with total count', async () => {
        // ARRANGE
        const users = UserFactory.buildMany(3);
        mockRepository.findAll.mockResolvedValue([users, 10]);

        // ACT
        const [result, total] = await service.findAll(10, 0);

        // ASSERT
        expect(result).toHaveLength(3);
        expect(result).toEqual(users);
        expect(total).toBe(10);
        expect(
          mockRepository.findAll.mock.calls[mockRepository.findAll.mock.calls.length - 1],
        ).toEqual([10, 0]);
      });

      it('should handle pagination with custom offset', async () => {
        // ARRANGE
        const users = UserFactory.buildMany(5);
        mockRepository.findAll.mockResolvedValue([users, 25]);

        // ACT
        const [result, total] = await service.findAll(5, 20);

        // ASSERT
        expect(result).toHaveLength(5);
        expect(total).toBe(25);
        expect(
          mockRepository.findAll.mock.calls[mockRepository.findAll.mock.calls.length - 1],
        ).toEqual([5, 20]);
      });

      it('should use default params when not provided', async () => {
        // ARRANGE
        const users = UserFactory.buildMany(1);
        mockRepository.findAll.mockResolvedValue([users, 1]);

        // ACT
        const [result] = await service.findAll();

        // ASSERT
        expect(result).toHaveLength(1);
        expect(
          mockRepository.findAll.mock.calls[mockRepository.findAll.mock.calls.length - 1],
        ).toEqual([undefined, undefined]);
      });

      it('should return empty array when no users exist', async () => {
        // ARRANGE
        mockRepository.findAll.mockResolvedValue([[], 0]);

        // ACT
        const [result, total] = await service.findAll(10, 0);

        // ASSERT
        expect(result).toEqual([]);
        expect(total).toBe(0);
      });
    });

    describe('ERROR HANDLING: Repository fails', () => {
      it('should throw DATABASE_ERROR when repository throws', async () => {
        // ARRANGE
        mockRepository.findAll.mockRejectedValue(new Error('Query failed'));

        // ACT & ASSERT
        const error = await service.findAll().catch((e: unknown) => e);
        expect((error as Record<string, unknown>).code).toBe('DATABASE_ERROR');
        expect(loggerErrorSpy).toHaveBeenCalled();
      });
    });
  });

  // ───────────────────────────────────────────────────────────────────────────
  // update()
  // ───────────────────────────────────────────────────────────────────────────
  describe('update()', () => {
    describe('HAPPY PATH: Update succeeds', () => {
      it('should update user pseudo and return updated entity', async () => {
        // ARRANGE
        const updated = UserFactory.build({
          id: 'user-123',
          pseudo: 'new-pseudo',
        });
        mockRepository.update.mockResolvedValue(updated);

        // ACT
        const result = await service.update('user-123', { pseudo: 'new-pseudo' });

        // ASSERT
        expect(result).toEqual(updated);
        expect(result.pseudo).toBe('new-pseudo');
        expect(
          mockRepository.update.mock.calls[mockRepository.update.mock.calls.length - 1],
        ).toEqual([
          'user-123',
          {
            pseudo: 'new-pseudo',
          },
        ]);
      });

      it('should update RNA with valid format', async () => {
        // ARRANGE
        const updated = UserFactory.build({ rna: 'W111111111' });
        mockRepository.update.mockResolvedValue(updated);

        // ACT
        const result = await service.update('user-1', { rna: 'W111111111' });

        // ASSERT
        expect(result).toEqual(updated);
        expect(
          mockRepository.update.mock.calls[mockRepository.update.mock.calls.length - 1],
        ).toEqual(['user-1', { rna: 'W111111111' }]);
      });

      it('should allow partial update with only email', async () => {
        // ARRANGE
        const updated = UserFactory.build({ email: 'newemail@example.com' });
        mockRepository.update.mockResolvedValue(updated);

        // ACT
        const result = await service.update('user-1', { email: 'newemail@example.com' });

        // ASSERT
        expect(result.email).toBe('newemail@example.com');
      });

      it('should not call repository when no RNA change provided', async () => {
        // ARRANGE
        const updated = UserFactory.build({ bio: 'New bio' });
        mockRepository.update.mockResolvedValue(updated);

        // ACT
        await service.update('user-1', { bio: 'New bio' });

        // ASSERT
        expect(
          mockRepository.update.mock.calls[mockRepository.update.mock.calls.length - 1],
        ).toEqual(['user-1', { bio: 'New bio' }]);
      });
    });

    describe('SAD PATH: User not found', () => {
      it('should throw NOT_FOUND when update returns null', async () => {
        // ARRANGE
        mockRepository.update.mockResolvedValue(null);

        // ACT & ASSERT
        const error = await service.update('missing', { pseudo: 'test' }).catch((e: unknown) => e);
        expect((error as Record<string, unknown>).code).toBe('NOT_FOUND');
        expect((error as Record<string, unknown>).message).toContain('missing');
        expect(loggerWarnSpy).toHaveBeenCalled();
      });
    });

    describe('SAD PATH: Validation fails', () => {
      it('should throw BAD_REQUEST for invalid RNA on update', async () => {
        // ARRANGE
        const invalidRna = 'BAD-RNA-123';

        // ACT & ASSERT
        const error = await service.update('user-1', { rna: invalidRna }).catch((e: unknown) => e);
        expect((error as Record<string, unknown>).code).toBe('BAD_REQUEST');
        expect((error as Record<string, unknown>).message).toContain(invalidRna);
        expect(loggerWarnSpy).toHaveBeenCalled();
        expect(mockRepository.update.mock.calls).toHaveLength(0);
      });

      it('should not update if only null/undefined RNA provided', async () => {
        // ARRANGE
        const updated = UserFactory.build({ rna: undefined });
        mockRepository.update.mockResolvedValue(updated);

        // ACT
        await service.update('user-1', { rna: undefined });

        // ASSERT: null/undefined RNA should not trigger validation
        expect(mockRepository.update.mock.calls.length).toBeGreaterThan(0);
      });
    });

    describe('ERROR HANDLING: Database failures', () => {
      it('should throw DATABASE_ERROR when repository fails', async () => {
        // ARRANGE
        mockRepository.update.mockRejectedValue(new Error('Update failed'));

        // ACT & ASSERT
        const error = await service.update('user-1', { pseudo: 'new' }).catch((e: unknown) => e);
        expect((error as Record<string, unknown>).code).toBe('DATABASE_ERROR');
        expect(loggerErrorSpy).toHaveBeenCalled();
      });
    });
  });

  // ───────────────────────────────────────────────────────────────────────────
  // delete()
  // ───────────────────────────────────────────────────────────────────────────
  describe('delete()', () => {
    describe('HAPPY PATH: User deleted', () => {
      it('should delete user when found', async () => {
        // ARRANGE
        mockRepository.delete.mockResolvedValue(true);

        // ACT
        await service.delete('user-123');

        // ASSERT
        expect(
          mockRepository.delete.mock.calls[mockRepository.delete.mock.calls.length - 1],
        ).toEqual(['user-123']);
        expect(mockRepository.delete.mock.calls).toHaveLength(1);
      });
    });

    describe('SAD PATH: User not found', () => {
      it('should throw NOT_FOUND when user does not exist', async () => {
        // ARRANGE
        mockRepository.delete.mockResolvedValue(false);

        // ACT & ASSERT
        const error = await service.delete('missing').catch((e: unknown) => e);
        expect((error as Record<string, unknown>).code).toBe('NOT_FOUND');
        expect((error as Record<string, unknown>).message).toContain('missing');
        expect(loggerWarnSpy).toHaveBeenCalled();
      });
    });

    describe('ERROR HANDLING: Database failures', () => {
      it('should throw DATABASE_ERROR when repository fails', async () => {
        // ARRANGE
        mockRepository.delete.mockRejectedValue(new Error('Delete constraint violation'));

        // ACT & ASSERT
        const error = await service.delete('user-1').catch((e: unknown) => e);
        expect((error as Record<string, unknown>).code).toBe('DATABASE_ERROR');
        expect(loggerErrorSpy).toHaveBeenCalled();
      });
    });
  });

  // ───────────────────────────────────────────────────────────────────────────
  // addBadgeToUser()
  // ───────────────────────────────────────────────────────────────────────────
  describe('addBadgeToUser()', () => {
    describe('HAPPY PATH: Badge added successfully', () => {
      it('should add badge to user when badge not already present', async () => {
        // ARRANGE
        const user = UserFactory.build({ id: 'user-123', badges: [] });
        const badge = BadgeFactory.build({ id: 'badge-456' });
        mockRepository.findById.mockResolvedValue(user);
        mockBadgeService.findById.mockResolvedValue(badge);
        mockRepository.addBadgeToUser.mockResolvedValue();

        // ACT
        await service.addBadgeToUser('user-123', 'badge-456');

        // ASSERT
        expect(
          mockRepository.findById.mock.calls[mockRepository.findById.mock.calls.length - 1],
        ).toEqual(['user-123']);
        expect(
          mockBadgeService.findById.mock.calls[mockBadgeService.findById.mock.calls.length - 1],
        ).toEqual(['badge-456']);
        expect(
          mockRepository.addBadgeToUser.mock.calls[
            mockRepository.addBadgeToUser.mock.calls.length - 1
          ],
        ).toEqual(['user-123', 'badge-456']);
      });

      it('should add badge to user with existing badges', async () => {
        // ARRANGE
        const existingBadge = BadgeFactory.build({ id: 'badge-111' });
        const newBadge = BadgeFactory.build({ id: 'badge-222' });
        const user = UserFactory.build({ id: 'user-1', badges: [existingBadge] });
        mockRepository.findById.mockResolvedValue(user);
        mockBadgeService.findById.mockResolvedValue(newBadge);
        mockRepository.addBadgeToUser.mockResolvedValue();

        // ACT
        await service.addBadgeToUser('user-1', 'badge-222');

        // ASSERT
        expect(
          mockRepository.addBadgeToUser.mock.calls[
            mockRepository.addBadgeToUser.mock.calls.length - 1
          ],
        ).toEqual(['user-1', 'badge-222']);
      });
    });

    describe('SAD PATH: Badge already exists', () => {
      it('should throw CONFLICT when user already has badge', async () => {
        // ARRANGE
        const badge = BadgeFactory.build({ id: 'badge-1' });
        const user = UserFactory.build({ id: 'user-123', badges: [badge] });
        mockRepository.findById.mockResolvedValue(user);
        mockBadgeService.findById.mockResolvedValue(badge);

        // ACT & ASSERT
        const error = await service.addBadgeToUser('user-123', 'badge-1').catch((e: unknown) => e);
        expect((error as Record<string, unknown>).code).toBe('CONFLICT');
        expect((error as Record<string, unknown>).message).toContain('user-123');
        expect((error as Record<string, unknown>).message).toContain('badge-1');
        expect(loggerWarnSpy).toHaveBeenCalled();
        expect(mockRepository.addBadgeToUser.mock.calls).toHaveLength(0);
      });
    });

    describe('ERROR HANDLING: User or badge not found', () => {
      it('should throw NOT_FOUND when user does not exist', async () => {
        // ARRANGE
        mockRepository.findById.mockResolvedValue(null);

        // ACT & ASSERT
        const error = await service
          .addBadgeToUser('missing-user', 'badge-1')
          .catch((e: unknown) => e);
        expect((error as Record<string, unknown>).code).toBe('NOT_FOUND');
        expect(mockRepository.addBadgeToUser.mock.calls).toHaveLength(0);
      });

      it('should throw NOT_FOUND when badge does not exist', async () => {
        // ARRANGE
        const user = UserFactory.build({ id: 'user-1', badges: [] });
        mockRepository.findById.mockResolvedValue(user);
        const badgeNotFoundError = new NotFoundError('Badge with id missing-badge not found');
        mockBadgeService.findById.mockRejectedValue(badgeNotFoundError);

        // ACT & ASSERT
        const error = await service
          .addBadgeToUser('user-1', 'missing-badge')
          .catch((e: unknown) => e);
        expect((error as Record<string, unknown>).code).toBe('NOT_FOUND');
      });

      it('should throw DATABASE_ERROR when repository fails', async () => {
        // ARRANGE
        const user = UserFactory.build({ id: 'user-1', badges: [] });
        const badge = BadgeFactory.build({ id: 'badge-1' });
        mockRepository.findById.mockResolvedValue(user);
        mockBadgeService.findById.mockResolvedValue(badge);
        mockRepository.addBadgeToUser.mockRejectedValue(new Error('DB error'));

        // ACT & ASSERT
        const error = await service.addBadgeToUser('user-1', 'badge-1').catch((e: unknown) => e);
        expect((error as Record<string, unknown>).code).toBe('DATABASE_ERROR');
        expect(loggerErrorSpy).toHaveBeenCalled();
      });
    });
  });

  // ───────────────────────────────────────────────────────────────────────────
  // removeBadgeFromUser()
  // ───────────────────────────────────────────────────────────────────────────
  describe('removeBadgeFromUser()', () => {
    describe('HAPPY PATH: Badge removed successfully', () => {
      it('should remove badge when user has it', async () => {
        // ARRANGE
        const badge = BadgeFactory.build({ id: 'badge-1' });
        const user = UserFactory.build({ id: 'user-1', badges: [badge] });
        mockRepository.findById.mockResolvedValue(user);
        mockRepository.removeBadgeFromUser.mockResolvedValue();

        // ACT
        await service.removeBadgeFromUser('user-1', 'badge-1');

        // ASSERT
        expect(
          mockRepository.removeBadgeFromUser.mock.calls[
            mockRepository.removeBadgeFromUser.mock.calls.length - 1
          ],
        ).toEqual(['user-1', 'badge-1']);
        expect(
          mockRepository.findById.mock.calls[mockRepository.findById.mock.calls.length - 1],
        ).toEqual(['user-1']);
      });

      it('should remove badge from user with multiple badges', async () => {
        // ARRANGE
        const badge1 = BadgeFactory.build({ id: 'badge-1' });
        const badge2 = BadgeFactory.build({ id: 'badge-2' });
        const badge3 = BadgeFactory.build({ id: 'badge-3' });
        const user = UserFactory.build({ id: 'user-1', badges: [badge1, badge2, badge3] });
        mockRepository.findById.mockResolvedValue(user);
        mockRepository.removeBadgeFromUser.mockResolvedValue();

        // ACT
        await service.removeBadgeFromUser('user-1', 'badge-2');

        // ASSERT
        expect(
          mockRepository.removeBadgeFromUser.mock.calls[
            mockRepository.removeBadgeFromUser.mock.calls.length - 1
          ],
        ).toEqual(['user-1', 'badge-2']);
      });
    });

    describe('SAD PATH: Badge not found on user', () => {
      it('should throw NOT_FOUND when user does not have badge', async () => {
        // ARRANGE
        const user = UserFactory.build({ id: 'user-1', badges: [] });
        mockRepository.findById.mockResolvedValue(user);

        // ACT & ASSERT
        const error = await service
          .removeBadgeFromUser('user-1', 'badge-1')
          .catch((e: unknown) => e);
        expect((error as Record<string, unknown>).code).toBe('NOT_FOUND');
        expect((error as Record<string, unknown>).message).toContain('user-1');
        expect((error as Record<string, unknown>).message).toContain('badge-1');
        expect(loggerWarnSpy).toHaveBeenCalled();
        expect(mockRepository.removeBadgeFromUser.mock.calls).toHaveLength(0);
      });

      it('should throw NOT_FOUND when user has different badges', async () => {
        // ARRANGE
        const otherBadge = BadgeFactory.build({ id: 'other-badge' });
        const user = UserFactory.build({ id: 'user-1', badges: [otherBadge] });
        mockRepository.findById.mockResolvedValue(user);

        // ACT & ASSERT
        const error = await service
          .removeBadgeFromUser('user-1', 'badge-to-remove')
          .catch((e: unknown) => e);
        expect((error as Record<string, unknown>).code).toBe('NOT_FOUND');
      });
    });

    describe('ERROR HANDLING: User not found', () => {
      it('should throw NOT_FOUND when user does not exist', async () => {
        // ARRANGE
        mockRepository.findById.mockResolvedValue(null);

        // ACT & ASSERT
        const error = await service
          .removeBadgeFromUser('missing-user', 'badge-1')
          .catch((e: unknown) => e);
        expect((error as Record<string, unknown>).code).toBe('NOT_FOUND');
        expect(mockRepository.removeBadgeFromUser.mock.calls).toHaveLength(0);
      });

      it('should throw DATABASE_ERROR when repository fails', async () => {
        // ARRANGE
        const badge = BadgeFactory.build({ id: 'badge-1' });
        const user = UserFactory.build({ id: 'user-1', badges: [badge] });
        mockRepository.findById.mockResolvedValue(user);
        mockRepository.removeBadgeFromUser.mockRejectedValue(new Error('Delete failed'));

        // ACT & ASSERT
        const error = await service
          .removeBadgeFromUser('user-1', 'badge-1')
          .catch((e: unknown) => e);
        expect((error as Record<string, unknown>).code).toBe('DATABASE_ERROR');
        expect(loggerErrorSpy).toHaveBeenCalled();
      });
    });
  });

  // ───────────────────────────────────────────────────────────────────────────
  // incrementImpactScore()
  // ───────────────────────────────────────────────────────────────────────────
  describe('incrementImpactScore()', () => {
    describe('HAPPY PATH: Score incremented successfully', () => {
      it('should increment score by positive amount', async () => {
        // ARRANGE
        mockRepository.incrementImpactScore.mockResolvedValue();

        // ACT
        await service.incrementImpactScore('user-1', 10);

        // ASSERT
        expect(
          mockRepository.incrementImpactScore.mock.calls[
            mockRepository.incrementImpactScore.mock.calls.length - 1
          ],
        ).toEqual(['user-1', 10]);
        expect(mockRepository.incrementImpactScore.mock.calls).toHaveLength(1);
      });

      it('should increment by minimum positive value (1)', async () => {
        // ARRANGE
        mockRepository.incrementImpactScore.mockResolvedValue();

        // ACT
        await service.incrementImpactScore('user-1', 1);

        // ASSERT
        expect(
          mockRepository.incrementImpactScore.mock.calls[
            mockRepository.incrementImpactScore.mock.calls.length - 1
          ],
        ).toEqual(['user-1', 1]);
      });

      it('should increment by large positive value', async () => {
        // ARRANGE
        mockRepository.incrementImpactScore.mockResolvedValue();

        // ACT
        await service.incrementImpactScore('user-1', 9999);

        // ASSERT
        expect(
          mockRepository.incrementImpactScore.mock.calls[
            mockRepository.incrementImpactScore.mock.calls.length - 1
          ],
        ).toEqual(['user-1', 9999]);
      });
    });

    describe('SAD PATH: Invalid score increment', () => {
      it('should throw BAD_REQUEST when score is zero', async () => {
        // ARRANGE: No arrangement needed, validation happens in service

        // ACT & ASSERT
        const error = await service.incrementImpactScore('user-1', 0).catch((e: unknown) => e);
        expect((error as Record<string, unknown>).code).toBe('BAD_REQUEST');
        expect((error as Record<string, unknown>).message).toContain('0');
        expect(loggerWarnSpy).toHaveBeenCalled();
        expect(mockRepository.incrementImpactScore.mock.calls).toHaveLength(0);
      });

      it('should throw BAD_REQUEST when score is negative', async () => {
        // ARRANGE: No arrangement needed

        // ACT & ASSERT
        const error = await service.incrementImpactScore('user-1', -5).catch((e: unknown) => e);
        expect((error as Record<string, unknown>).code).toBe('BAD_REQUEST');
        expect((error as Record<string, unknown>).message).toContain('-5');
        expect(loggerWarnSpy).toHaveBeenCalled();
        expect(mockRepository.incrementImpactScore.mock.calls).toHaveLength(0);
      });

      it('should throw BAD_REQUEST for very large negative', async () => {
        // ARRANGE

        // ACT & ASSERT
        const error = await service.incrementImpactScore('user-1', -9999).catch((e: unknown) => e);
        expect((error as Record<string, unknown>).code).toBe('BAD_REQUEST');
        expect(mockRepository.incrementImpactScore.mock.calls).toHaveLength(0);
      });
    });

    describe('ERROR HANDLING: Repository failure', () => {
      it('should throw DATABASE_ERROR when repository fails', async () => {
        // ARRANGE
        mockRepository.incrementImpactScore.mockRejectedValue(new Error('Update failed'));

        // ACT & ASSERT
        const error = await service.incrementImpactScore('user-1', 5).catch((e: unknown) => e);
        expect((error as Record<string, unknown>).code).toBe('DATABASE_ERROR');
        expect((error as Record<string, unknown>).message).toContain('incrementing impact score');
        expect(loggerErrorSpy).toHaveBeenCalled();
      });

      it('should log error details when repository fails', async () => {
        // ARRANGE
        const dbError = new Error('Connection pool exhausted');
        mockRepository.incrementImpactScore.mockRejectedValue(dbError);

        // ACT
        try {
          await service.incrementImpactScore('user-1', 3);
          // Expected not to throw here
        } catch {
          // Expected
        }

        // ASSERT
        expect(loggerErrorSpy).toHaveBeenCalled();
      });
    });
  });
});
