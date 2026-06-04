import { createMock } from '@volontariapp/testing';
import type { IEventRepository } from '../../../repositories/interfaces/event.repository.js';

export const createEventRepositoryMock = () => {
  const mock = createMock<IEventRepository>();
  return mock;
};
