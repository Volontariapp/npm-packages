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
import { PostgresUserRepository } from '../../repositories/postgres-user.repository.js';
import { UserFactory } from '../__test-utils__/factories/user.factory.js';
import { UserStatus } from '../../entities/user-status.enum.js';
import { hashPassword } from '@volontariapp/crypto';
import { Streams } from '@volontariapp/shared';
import { UserEventMessagingType } from '@volontariapp/messaging';

interface EventQueueRow {
  type: string;
  emitter: string;
  emitterId: string;
  target_services: string[];
}

describe('User deletion (Integration)', () => {
  let userRepository: PostgresUserRepository;

  beforeAll(async () => {
    await initializeTestDb();
    userRepository = new PostgresUserRepository(
      getTestRepository(UserModel),
      'test-email-encryption-secret-32ch',
    );
  });

  afterAll(async () => {
    await closeTestDb();
  });

  beforeEach(async () => {
    await truncateAll();
  });

  const createUser = () =>
    userRepository.createWithHashedPassword(UserFactory.buildInput(), hashPassword('Password123!'));

  const deletedEvents = (): Promise<EventQueueRow[]> =>
    testDataSource.query('SELECT * FROM event_queue WHERE type = $1', [
      UserEventMessagingType.USER_DELETED,
    ]);

  describe('requestDeletionWithUserDeleted()', () => {
    it('should mark the user PENDING_DELETION and keep the row', async () => {
      // Arrange
      const created = await createUser();

      // Act
      const result = await userRepository.requestDeletionWithUserDeleted(created.id);

      // Assert
      expect(result?.status).toBe(UserStatus.PENDING_DELETION);
      const found = await userRepository.findById(created.id);
      expect(found?.status).toBe(UserStatus.PENDING_DELETION);
      expect(found?.deletionRequestedAt).toBeDefined();
    });

    it('should write user.deleted to the outbox for every domain stream', async () => {
      // Arrange
      const created = await createUser();

      // Act
      await userRepository.requestDeletionWithUserDeleted(created.id);

      // Assert
      const events = await deletedEvents();
      expect(events).toHaveLength(1);
      expect(events[0].emitter).toBe('ms-user');
      expect(events[0].emitterId).toBe(created.id);
      expect([...events[0].target_services].sort()).toEqual(
        [
          Streams.USER_DELETED,
          Streams.SOCIAL_USER,
          Streams.USER_DELETED_POST,
          Streams.USER_DELETED_EVENT,
          Streams.USER_DELETED_STORAGE,
        ].sort(),
      );
    });

    it('should not emit a second event when already pending', async () => {
      // Arrange
      const created = await createUser();
      await userRepository.requestDeletionWithUserDeleted(created.id);

      // Act
      await userRepository.requestDeletionWithUserDeleted(created.id);

      // Assert
      expect(await deletedEvents()).toHaveLength(1);
    });

    it('should return null and emit nothing when the user does not exist', async () => {
      // Act
      const result = await userRepository.requestDeletionWithUserDeleted(
        '00000000-0000-0000-0000-000000000000',
      );

      // Assert
      expect(result).toBeNull();
      expect(await deletedEvents()).toHaveLength(0);
    });
  });

  describe('finalizeDeletion()', () => {
    it('should delete a PENDING_DELETION user', async () => {
      // Arrange
      const created = await createUser();
      await userRepository.requestDeletionWithUserDeleted(created.id);

      // Act
      const result = await userRepository.finalizeDeletion(created.id);

      // Assert
      expect(result).toBe(true);
      expect(await userRepository.findById(created.id)).toBeNull();
    });

    it('should refuse to delete an ACTIVE user', async () => {
      // Arrange
      const created = await createUser();

      // Act
      const result = await userRepository.finalizeDeletion(created.id);

      // Assert
      expect(result).toBe(false);
      expect(await userRepository.findById(created.id)).not.toBeNull();
    });
  });
});
