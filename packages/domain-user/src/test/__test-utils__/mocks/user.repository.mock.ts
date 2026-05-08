import type { jest } from '@jest/globals';
import { createMock } from '@volontariapp/testing';
import type { IUserRepository } from '../../../repositories/interfaces/user.repository.js';

export const createUserRepositoryMock = (): jest.Mocked<IUserRepository> =>
  createMock<IUserRepository>();
