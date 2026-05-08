import type { jest } from '@jest/globals';
import { createMock } from '@volontariapp/testing';
import type { IBadgeRepository } from '../../../repositories/interfaces/badge.repository.js';

export const createBadgeRepositoryMock = (): jest.Mocked<IBadgeRepository> =>
  createMock<IBadgeRepository>();
