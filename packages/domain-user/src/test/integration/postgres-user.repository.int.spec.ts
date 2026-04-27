import 'reflect-metadata';
import { describe, it, expect, beforeAll, afterAll, beforeEach } from '@jest/globals';
import {
  testDataSource,
  initializeTestDb,
  closeTestDb,
  truncateAll,
  getTestRepository,
} from '../data-source.js';
import { UserModel } from '../../models/user.model.js';
import { BadgeModel } from '../../models/badge.model.js';
import { PostgresUserRepository } from '../../repositories/postgres-user.repository.js';
import { PostgresBadgeRepository } from '../../repositories/postgres-badge.repository.js';
import { UserFactory } from '../__test-utils__/factories/user.factory.js';
import { BadgeFactory } from '../__test-utils__/factories/badge.factory.js';
import { UserEntity } from '../../entities/user.entity.js';
import { hashPassword } from '@volontariapp/crypto';

describe('PostgresUserRepository (Integration)', () => {
  let userRepository: PostgresUserRepository;
  let badgeRepository: PostgresBadgeRepository;

  beforeAll(async () => {
    await initializeTestDb();
    userRepository = new PostgresUserRepository(
      getTestRepository(UserModel),
      'test-email-encryption-secret-32ch',
    );
    badgeRepository = new PostgresBadgeRepository(getTestRepository(BadgeModel));
  });

  afterAll(async () => {
    await closeTestDb();
  });

  beforeEach(async () => {
    await truncateAll();
  });

  const createTestUser = async (overrides: Partial<UserEntity> = {}): Promise<UserEntity> => {
    const input = UserFactory.buildInput(overrides);
    return userRepository.createWithHashedPassword(input, hashPassword('TestPassword123!'));
  };

  // ─── createWithHashedPassword ─────────────────────────────────────────────

  describe('createWithHashedPassword()', () => {
    it('should persist user and return mapped UserEntity', async () => {
      // Arrange
      const input = UserFactory.buildInput({ email: 'test@example.com', pseudo: 'testuser' });
      const hashedPwd = hashPassword('Password123!');

      // Act
      const result = await userRepository.createWithHashedPassword(input, hashedPwd);

      // Assert
      expect(result).toBeInstanceOf(UserEntity);
      expect(result.id).toBeDefined();
      expect(result.email).toBe('test@example.com');
      expect(result.pseudo).toBe('testuser');
      expect(result.totalImpactScore).toBe(0);
      expect(result.badges).toEqual([]);
    });

    it('should generate UUID for id', async () => {
      // Arrange
      const input = UserFactory.buildInput();
      const hashedPwd = hashPassword('Password123!');

      // Act
      const result = await userRepository.createWithHashedPassword(input, hashedPwd);

      // Assert
      expect(result.id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/);
    });

    it('should throw on duplicate email (unique constraint violation)', async () => {
      // Arrange
      const input = UserFactory.buildInput({ email: 'dup@example.com' });
      await userRepository.createWithHashedPassword(input, hashPassword('Pass123!'));

      // Act & Assert
      await expect(
        userRepository.createWithHashedPassword(input, hashPassword('Pass123!')),
      ).rejects.toThrow();
    });
  });

  // ─── findPasswordHashByEmail ──────────────────────────────────────────────

  describe('findPasswordHashByEmail()', () => {
    it('should return the stored hash when user exists', async () => {
      // Arrange
      const hashedPwd = hashPassword('MySecurePassword!');
      const input = UserFactory.buildInput({ email: 'pw@example.com' });
      await userRepository.createWithHashedPassword(input, hashedPwd);

      // Act
      const result = await userRepository.findPasswordHashByEmail('pw@example.com');

      // Assert
      expect(result).not.toBeNull();
      expect(result).toBe(hashedPwd);
    });

    it('should return null when user does not exist', async () => {
      // Act
      const result = await userRepository.findPasswordHashByEmail('nouser@example.com');

      // Assert
      expect(result).toBeNull();
    });
  });

  // ─── findByEmail ──────────────────────────────────────────────────────────

  describe('findByEmail()', () => {
    it('should return user entity when email matches', async () => {
      // Arrange
      const created = await createTestUser({ email: 'find@example.com' });

      // Act
      const result = await userRepository.findByEmail('find@example.com');

      // Assert
      expect(result).not.toBeNull();
      expect(result?.id).toBe(created.id);
      expect(result?.email).toBe('find@example.com');
    });

    it('should return null when email does not exist', async () => {
      // Act
      const result = await userRepository.findByEmail('nonexistent@example.com');

      // Assert
      expect(result).toBeNull();
    });
  });

  // ─── findByRna ────────────────────────────────────────────────────────────

  describe('findByRna()', () => {
    it('should return user entity when RNA matches', async () => {
      // Arrange
      const created = await createTestUser({ rna: 'W123456789' });

      // Act
      const result = await userRepository.findByRna('W123456789');

      // Assert
      expect(result).not.toBeNull();
      expect(result?.id).toBe(created.id);
      expect(result?.rna).toBe('W123456789');
    });

    it('should return null when RNA does not exist', async () => {
      // Act
      const result = await userRepository.findByRna('W000000000');

      // Assert
      expect(result).toBeNull();
    });
  });

  // ─── findById ─────────────────────────────────────────────────────────────

  describe('findById()', () => {
    it('should return user entity when id matches', async () => {
      // Arrange
      const created = await createTestUser();

      // Act
      const result = await userRepository.findById(created.id);

      // Assert
      expect(result).not.toBeNull();
      expect(result?.id).toBe(created.id);
      expect(result?.badges).toEqual([]);
    });

    it('should return null when id does not exist', async () => {
      // Act
      const result = await userRepository.findById('00000000-0000-0000-0000-000000000000');

      // Assert
      expect(result).toBeNull();
    });
  });

  // ─── findAll ──────────────────────────────────────────────────────────────

  describe('findAll()', () => {
    it('should return all persisted users with total count', async () => {
      // Arrange
      await createTestUser();
      await createTestUser();
      await createTestUser();

      // Act
      const [users, total] = await userRepository.findAll();

      // Assert
      expect(users).toHaveLength(3);
      expect(total).toBe(3);
      expect(users[0]).toBeInstanceOf(UserEntity);
    });

    it('should respect limit and offset for pagination', async () => {
      // Arrange
      await createTestUser();
      await createTestUser();
      await createTestUser();

      // Act
      const [users, total] = await userRepository.findAll(2, 0);

      // Assert
      expect(users).toHaveLength(2);
      expect(total).toBe(3);
    });

    it('should return empty array and 0 when no users exist', async () => {
      // Act
      const [users, total] = await userRepository.findAll();

      // Assert
      expect(users).toHaveLength(0);
      expect(total).toBe(0);
    });
  });

  // ─── update ───────────────────────────────────────────────────────────────

  describe('update()', () => {
    it('should update user pseudo and return updated entity', async () => {
      // Arrange
      const created = await createTestUser({ pseudo: 'old-pseudo' });

      // Act
      const result = await userRepository.update(created.id, { pseudo: 'new-pseudo' });

      // Assert
      expect(result).not.toBeNull();
      expect(result?.id).toBe(created.id);
      expect(result?.pseudo).toBe('new-pseudo');
    });

    it('should update user bio without touching other fields', async () => {
      // Arrange
      const created = await createTestUser({ pseudo: 'unchanged', bio: 'old bio' });

      // Act
      const result = await userRepository.update(created.id, { bio: 'new bio' });

      // Assert
      expect(result?.bio).toBe('new bio');
      expect(result?.pseudo).toBe('unchanged');
    });

    it('should return null when updating non-existent user', async () => {
      // Act
      const result = await userRepository.update('00000000-0000-0000-0000-000000000000', {
        pseudo: 'ghost',
      });

      // Assert
      expect(result).toBeNull();
    });
  });

  // ─── delete ───────────────────────────────────────────────────────────────

  describe('delete()', () => {
    it('should delete user and return true', async () => {
      // Arrange
      const created = await createTestUser();

      // Act
      const result = await userRepository.delete(created.id);

      // Assert
      expect(result).toBe(true);
      const found = await userRepository.findById(created.id);
      expect(found).toBeNull();
    });

    it('should return false when deleting non-existent user', async () => {
      // Act
      const result = await userRepository.delete('00000000-0000-0000-0000-000000000000');

      // Assert
      expect(result).toBe(false);
    });
  });

  // ─── addBadgeToUser ───────────────────────────────────────────────────────

  describe('addBadgeToUser()', () => {
    it('should create user_badges row linking user and badge', async () => {
      // Arrange
      const user = await createTestUser();
      const badge = await badgeRepository.create(BadgeFactory.buildInput({ iconPath: 'icon.svg' }));

      // Act
      await userRepository.addBadgeToUser(user.id, badge.id);

      // Assert
      const rows: { user_id: string; badge_id: string }[] = await testDataSource.query(
        'SELECT * FROM user_badges WHERE user_id = $1 AND badge_id = $2',
        [user.id, badge.id],
      );
      expect(rows).toHaveLength(1);
      expect(rows[0].user_id).toBe(user.id);
      expect(rows[0].badge_id).toBe(badge.id);
    });

    it('should associate multiple badges to the same user', async () => {
      // Arrange
      const user = await createTestUser();
      const badge1 = await badgeRepository.create(
        BadgeFactory.buildInput({ iconPath: 'icon.svg' }),
      );
      const badge2 = await badgeRepository.create(
        BadgeFactory.buildInput({ iconPath: 'icon.svg' }),
      );

      // Act
      await userRepository.addBadgeToUser(user.id, badge1.id);
      await userRepository.addBadgeToUser(user.id, badge2.id);

      // Assert
      const rows: { badge_id: string }[] = await testDataSource.query(
        'SELECT * FROM user_badges WHERE user_id = $1',
        [user.id],
      );
      expect(rows).toHaveLength(2);
    });
  });

  // ─── removeBadgeFromUser ──────────────────────────────────────────────────

  describe('removeBadgeFromUser()', () => {
    it('should remove user_badges row when badge is unlinked', async () => {
      // Arrange
      const user = await createTestUser();
      const badge = await badgeRepository.create(BadgeFactory.buildInput({ iconPath: 'icon.svg' }));
      await userRepository.addBadgeToUser(user.id, badge.id);

      // Act
      await userRepository.removeBadgeFromUser(user.id, badge.id);

      // Assert
      const removedRows: unknown[] = await testDataSource.query(
        'SELECT * FROM user_badges WHERE user_id = $1 AND badge_id = $2',
        [user.id, badge.id],
      );
      expect(removedRows).toHaveLength(0);
    });

    it('should only remove the targeted badge, not others', async () => {
      // Arrange
      const user = await createTestUser();
      const badge1 = await badgeRepository.create(
        BadgeFactory.buildInput({ iconPath: 'icon.svg' }),
      );
      const badge2 = await badgeRepository.create(
        BadgeFactory.buildInput({ iconPath: 'icon.svg' }),
      );
      await userRepository.addBadgeToUser(user.id, badge1.id);
      await userRepository.addBadgeToUser(user.id, badge2.id);

      // Act
      await userRepository.removeBadgeFromUser(user.id, badge1.id);

      // Assert
      const remainingRows: { badge_id: string }[] = await testDataSource.query(
        'SELECT * FROM user_badges WHERE user_id = $1',
        [user.id],
      );
      expect(remainingRows).toHaveLength(1);
      expect(remainingRows[0].badge_id).toBe(badge2.id);
    });
  });

  // ─── incrementImpactScore ─────────────────────────────────────────────────

  describe('incrementImpactScore()', () => {
    it('should increment total_impact_score in DB', async () => {
      // Arrange
      const created = await createTestUser();

      // Act
      await userRepository.incrementImpactScore(created.id, 10);

      // Assert
      const scoreRows: { total_impact_score: number }[] = await testDataSource.query(
        'SELECT total_impact_score FROM users WHERE id = $1',
        [created.id],
      );
      expect(Number(scoreRows[0].total_impact_score)).toBe(10);
    });

    it('should accumulate multiple increments', async () => {
      // Arrange
      const created = await createTestUser();

      // Act
      await userRepository.incrementImpactScore(created.id, 5);
      await userRepository.incrementImpactScore(created.id, 3);

      // Assert
      const accRows: { total_impact_score: number }[] = await testDataSource.query(
        'SELECT total_impact_score FROM users WHERE id = $1',
        [created.id],
      );
      expect(Number(accRows[0].total_impact_score)).toBe(8);
    });
  });
});
