import { jest } from '@jest/globals';
import { createMockLogger } from '@volontariapp/testing';
import type { Logger } from '@volontariapp/logger';
import { BaseWorker } from '../../../../core/base.worker.js';
import type { TestJob, TestJobType } from './test-job.utils.js';
import type { JobAuditRepository } from '../../../../data/repositories/job-audit.repository.js';

export type LoggerMock = jest.Mocked<Logger>;

function createLoggerMock(): LoggerMock {
  // eslint-disable-next-line @typescript-eslint/no-unsafe-call
  return createMockLogger<Logger>() as jest.Mocked<Logger>;
}

export class TestWorker extends BaseWorker<TestJobType> {
  public override logger: LoggerMock = createLoggerMock();
  public processJob = jest.fn() as jest.MockedFunction<(job: TestJob) => Promise<void>>;

  // eslint-disable-next-line @typescript-eslint/no-useless-constructor
  constructor(auditRepo?: JobAuditRepository) {
    super(auditRepo);
  }
}
