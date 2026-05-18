import { WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@volontariapp/logger';
import { hostname } from 'node:os';
import type { Job } from 'bullmq';
import type { JobMessagingType, JobRegistry } from '@volontariapp/messaging';
import type { JobAuditRepository } from '../data/index.js';
import { JobAuditStatus } from '@volontariapp/database';

export abstract class BaseWorker<K extends JobMessagingType> extends WorkerHost {
  protected readonly logger = new Logger({ context: this.constructor.name });
  protected readonly workerId: string = hostname();

  constructor(protected readonly auditRepo?: JobAuditRepository) {
    super();
  }

  async process(job: Job<JobRegistry[K], void, K>, _token?: string): Promise<void> {
    this.logger.info('Processing job', {
      jobId: job.id,
      type: job.name,
      workerId: this.workerId,
    });

    const startedAt = new Date();

    const alreadyCompleted = await this.isJobAlreadyCompleted(job);
    if (alreadyCompleted) {
      this.logger.warn('Job already processed, skipping', {
        jobId: job.id,
        type: job.name,
      });
      return;
    }

    await this.recordAuditStart(job, startedAt);

    try {
      await this.processJob(job);
      this.logger.info('Job completed', {
        jobId: job.id,
        type: job.name,
        workerId: this.workerId,
      });
      await this.recordAuditSuccess(job);
    } catch (error: unknown) {
      this.logger.error('Job failed', {
        jobId: job.id,
        type: job.name,
        workerId: this.workerId,
        error,
      });
      await this.recordAuditFailure(job, error);
      throw error;
    }
  }

  protected abstract processJob(job: Job<JobRegistry[K], void, K>): Promise<void>;

  private async isJobAlreadyCompleted(job: Job<JobRegistry[K], void, K>): Promise<boolean> {
    if (!this.auditRepo || !job.id) return false;

    try {
      const audit = await this.auditRepo.findByJobId(job.id);
      return audit?.status === JobAuditStatus.COMPLETED;
    } catch (error: unknown) {
      this.logger.error('Failed to check job completion status', {
        jobId: job.id,
        error,
      });
      return false;
    }
  }

  private async recordAuditStart(
    job: Job<JobRegistry[K], void, K>,
    startedAt: Date,
  ): Promise<void> {
    if (!this.auditRepo || !job.id) return;

    try {
      await this.auditRepo.upsert(
        {
          jobId: job.id,
          jobType: job.name,
          status: JobAuditStatus.PROCESSING,
          workerId: this.workerId,
          currentAttempt: job.attemptsMade + 1,
          startedAt,
        },
        ['jobId'],
      );
    } catch (error: unknown) {
      this.logger.error('Failed to record audit start', {
        jobId: job.id,
        error,
      });
    }
  }

  private async recordAuditSuccess(job: Job<JobRegistry[K], void, K>): Promise<void> {
    if (!this.auditRepo || !job.id) {
      return;
    }

    try {
      await this.auditRepo.updateWhere(
        { jobId: job.id },
        {
          status: JobAuditStatus.COMPLETED,
          finishedAt: new Date(),
        },
      );
    } catch (error: unknown) {
      this.logger.error('Failed to record audit success', {
        jobId: job.id,
        error,
      });
      throw error;
    }
  }

  private async recordAuditFailure(
    job: Job<JobRegistry[K], void, K>,
    error: unknown,
  ): Promise<void> {
    if (!this.auditRepo || !job.id) {
      return;
    }

    try {
      const errorMessage = error instanceof Error ? error.message : String(error);
      const errorStack = error instanceof Error ? error.stack : undefined;

      await this.auditRepo.updateWhere(
        { jobId: job.id },
        {
          status: JobAuditStatus.FAILED,
          errorMessage,
          errorStack,
          finishedAt: new Date(),
          currentAttempt: job.attemptsMade + 1,
        },
      );
    } catch (auditError: unknown) {
      this.logger.error('Failed to record audit failure', {
        jobId: job.id,
        error: auditError,
      });
      throw auditError;
    }
  }
}
