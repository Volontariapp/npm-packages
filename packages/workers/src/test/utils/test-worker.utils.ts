import { jest } from '@jest/globals';
import { createMockLogger } from '@volontariapp/testing';
import type { Logger } from '@volontariapp/logger';
import { BaseWorker } from '../../core/base.worker.js';
import type { TestJob, TestJobType } from './test-job.utils.js';

export type LoggerMock = jest.Mocked<Logger>;

export class TestWorker extends BaseWorker<TestJobType> {
  // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call
  public override logger: LoggerMock = createMockLogger<Logger>();
  public processJob = jest.fn() as jest.MockedFunction<(job: TestJob) => Promise<void>>;
}
