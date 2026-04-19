import { jest } from '@jest/globals';
import type { IParticipationRepository } from '../../../repositories/interfaces/participation.repository.js';

export const createParticipationRepositoryMock = (): jest.Mocked<IParticipationRepository> =>
  ({
    createEventNode: jest.fn(),
    deleteEventNode: jest.fn(),
    eventExists: jest.fn(),
    createUserEvent: jest.fn(),
    deleteUserEvent: jest.fn(),
    createParticipation: jest.fn(),
    deleteParticipation: jest.fn(),
    participationExists: jest.fn(),
    getUserEvents: jest.fn(),
    getUserParticipations: jest.fn(),
    getEventParticipants: jest.fn(),
  }) as unknown as jest.Mocked<IParticipationRepository>;
