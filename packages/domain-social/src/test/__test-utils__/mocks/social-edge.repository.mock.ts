import { createMock } from '@volontariapp/testing';
import type { ISocialEdgeRepository } from '../../../repositories/interfaces/social-edge.repository.js';
import type { ISocialEdgeGraphRepository } from '../../../repositories/interfaces/social-edge-graph.repository.js';

export const createSocialEdgeRepositoryMock = () => createMock<ISocialEdgeRepository>();

export const createSocialEdgeGraphRepositoryMock = () => createMock<ISocialEdgeGraphRepository>();
