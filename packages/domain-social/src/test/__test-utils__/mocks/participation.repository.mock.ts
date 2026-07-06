import { createMock } from '@volontariapp/testing';
import type { IParticipationRepository } from '../../../repositories/interfaces/participation.repository.js';

export const createParticipationRepositoryMock = () => {
  return createMock<IParticipationRepository>();
};
