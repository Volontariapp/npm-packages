import { jest } from '@jest/globals';
import type { TagService } from '../../../services/tag.service.js';

export const createTagServiceMock = (): jest.Mocked<TagService> =>
  ({
    findAll: jest.fn(),
    findById: jest.fn(),
    findByIds: jest.fn(),
    findBySlug: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  }) as unknown as jest.Mocked<TagService>;
