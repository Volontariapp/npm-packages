import type { jest } from '@jest/globals';
import type { QueryRunner } from 'typeorm';

export const makeQueryRunnerMock = () => {
  const queryBuilderMock = {
    update() {
      return this;
    },
    set() {
      return this;
    },
    where() {
      return this;
    },
    returning() {
      return this;
    },
    execute() {
      return Promise.resolve({ raw: [], generatedMaps: [], affected: 0 });
    },
  };

  const queryRunnerMock = {
    manager: {
      createQueryBuilder() {
        return queryBuilderMock;
      },
    },
  } as unknown as jest.Mocked<QueryRunner>;

  return { queryRunnerMock, queryBuilderMock };
};
