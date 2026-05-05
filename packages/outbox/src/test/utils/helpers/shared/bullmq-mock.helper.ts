import { jest } from '@jest/globals';
import { createMock } from '@volontariapp/database/testing';
import type { Queue, JobsOptions } from 'bullmq';

export interface MockJob {
  name: string;
  data: unknown;
  opts: JobsOptions;
}

export const mockQueue = createMock<Queue>();

export const setupBullMQMock = (): void => {
  jest.unstable_mockModule('bullmq', () => ({
    Queue: jest.fn().mockImplementation(() => mockQueue),
  }));
};
