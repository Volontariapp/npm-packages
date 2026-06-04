import { createMock } from '@volontariapp/testing';
import type { IRequirementRepository } from '../../../repositories/interfaces/requirement.repository.js';

export const createRequirementRepositoryMock = () => createMock<IRequirementRepository>();
