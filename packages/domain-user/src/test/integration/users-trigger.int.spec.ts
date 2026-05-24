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
import { hashPassword } from '@volontariapp/crypto';
import { Streams, UserRoles } from '@volontariapp/shared';
import type { EventQueueEntity } from '@volontariapp/database';
import type { IUserCreatedPayload } from '@volontariapp/messaging';
import { UserEventMessagingType } from '@volontariapp/messaging';

describe('Users Trigger (Integration)', () => {
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

  it('should insert a record into event_queue when a new user is created', async () => {
    // Arrange
    const input = UserFactory.buildInput({
      email: 'trigger@example.com',
      pseudo: 'triggeruser',
      role: UserRoles.VOLUNTEER,
    });
    const hashedPwd = hashPassword('Password123!');

    // Act
    const result = await userRepository.createWithHashedPassword(input, hashedPwd);

    // Assert
    const events: EventQueueEntity<UserEventMessagingType.USER_CREATED, IUserCreatedPayload>[] =
      await testDataSource.query('SELECT * FROM event_queue WHERE emitter = $1 AND type = $2', [
        'ms-user',
        'user.created',
      ]);

    expect(events).toHaveLength(1);
    const event = events[0];

    expect(event.type).toBe(UserEventMessagingType.USER_CREATED);
    expect(event.emitter).toBe('ms-user');
    expect(event.emitterId).toBe(result.id);
    expect(event.payload).toEqual({
      id: result.id,
      role: UserRoles.VOLUNTEER,
    });
    // NOTE: postgres returns snake_case columns if we don't alias them or use typeorm, and here we use raw query
    expect((event as unknown as { target_services: Streams[] }).target_services).toEqual([
      Streams.SOCIAL_USER,
    ]);
    expect(event.status).toBe('PENDING');
  });
});
