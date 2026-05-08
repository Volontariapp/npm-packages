import { jest } from '@jest/globals';
import { BaseWorker } from '../../core/base.worker.js';
import type { TestJob, TestJobType } from './test-job.utils.js';
import { makeLoggerMock, type LoggerMock } from '../mocks/logger.mock.js';

export class TestWorker extends BaseWorker<TestJobType> {
  public override logger: LoggerMock = makeLoggerMock();
  public processJob = jest.fn() as jest.MockedFunction<(job: TestJob) => Promise<void>>;
}
