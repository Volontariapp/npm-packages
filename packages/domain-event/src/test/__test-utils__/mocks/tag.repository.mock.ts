import { createMock } from '@volontariapp/testing';
import type { ITagRepository } from '../../../repositories/interfaces/tag.repository.js';

export const createTagRepositoryMock = () => createMock<ITagRepository>();
