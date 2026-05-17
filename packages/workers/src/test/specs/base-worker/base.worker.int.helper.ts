import { expect } from '@jest/globals';
import type { Job } from 'bullmq';
import type { TestWorker } from '../../utils/index.js';
import type { TestJob } from '../../utils/helpers/job/test-job.utils.js';

// Clean, type-safe payload interface for integration tests
export interface TestJobPayload {
  email?: string;
}

/**
 * Helper to get the first job from a list of jobs with a proper assertion
 * Generics used to avoid 'any', 'unknown', or 'never'
 */
export function getFirstJob<T, R, N extends string>(jobs: Job<T, R, N>[]): Job<T, R, N> {
  if (jobs.length === 0) {
    throw new Error('No jobs in queue');
  }
  return jobs[0];
}

/**
 * Helper to process a job on a worker with proper type-safe casting
 * Generics used to avoid 'any', 'unknown', or 'never'
 */
export async function processJob<T, R, N extends string>(
  worker: TestWorker,
  job: Job<T, R, N>,
): Promise<void> {
  return worker.process(job as TestJob);
}

/**
 * Helper to process a job expecting a rejection with a specific error
 * Generics used to avoid 'any', 'unknown', or 'never'
 */
export async function processJobExpectError<T, R, N extends string>(
  worker: TestWorker,
  job: Job<T, R, N>,
  error: Error,
): Promise<void> {
  return expect(worker.process(job as TestJob)).rejects.toThrow(error);
}
