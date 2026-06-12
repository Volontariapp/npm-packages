import { WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@volontariapp/logger';
import { hostname } from 'node:os';
import type { Job, RedisClient } from 'bullmq';
import type { JobMessagingType, JobRegistry, JobEnvelope } from '@volontariapp/messaging';
import type { JobAuditRepository } from '../data/index.js';
import { JobAuditStatus } from '@volontariapp/database';

export abstract class BaseWorker<K extends JobMessagingType> extends WorkerHost {
  protected readonly logger = new Logger({ context: this.constructor.name });
  protected readonly workerId: string = hostname();

  constructor(protected readonly auditRepo?: JobAuditRepository) {
    super();
  }

  /**
   * Returns the typed business payload from the job envelope.
   * Use this in processJob implementations instead of job.data directly.
   */
  protected getPayload(job: Job<JobEnvelope<JobRegistry[K]>, void, K>): JobRegistry[K] {
    return job.data.payload;
  }

  async process(job: Job<JobEnvelope<JobRegistry[K]>, void, K>, _token?: string): Promise<void> {
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
      const result = await this.processJob(job);
      this.logger.info('Job completed', {
        jobId: job.id,
        type: job.name,
        workerId: this.workerId,
      });
      await this.recordAuditSuccess(job, result);
    } catch (err) {
      const error = err instanceof Error || typeof err === 'string' ? err : new Error(String(err));

      this.logger.error('Job failed', {
        jobId: job.id,
        type: job.name,
        workerId: this.workerId,
        error: err,
      });
      await this.recordAuditFailure(job, error);
      throw err;
    }
  }

  protected abstract processJob(job: Job<JobEnvelope<JobRegistry[K]>, void, K>): Promise<unknown>;

  private async getRedisClient(): Promise<RedisClient | null> {
    try {
      return await this.worker.client;
    } catch {
      return null;
    }
  }

  private async isJobAlreadyCompleted(
    job: Job<JobEnvelope<JobRegistry[K]>, void, K>,
  ): Promise<boolean> {
    if (!job.id) return false;

    const client = await this.getRedisClient();
    if (client) {
      try {
        if (typeof client.get === 'function') {
          const isCompletedInRedis = await client.get(`job:completed:${job.id}`);
          if (isCompletedInRedis === 'true') {
            this.logger.warn(
              'Idempotency Guard: Job already processed and marked as completed in Redis. Skipping execution.',
              {
                jobId: job.id,
                type: job.name,
              },
            );
            return true;
          }
        }
      } catch (err) {
        const error = err instanceof Error ? err : new Error(String(err));
        this.logger.warn('Failed to check job completion in Redis, falling back to database', {
          jobId: job.id,
          error,
        });
      }
    }

    if (!this.auditRepo) return false;

    try {
      const audit = await this.auditRepo.findByJobId(job.id);
      const isCompletedInDb = audit?.status === JobAuditStatus.COMPLETED;
      if (isCompletedInDb) {
        this.logger.warn(
          'Idempotency Guard: Job already marked as COMPLETED in audit database. Skipping execution.',
          {
            jobId: job.id,
            type: job.name,
          },
        );
        await this.markJobAsCompletedInRedis(job.id);
        return true;
      }
      return false;
    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err));
      this.logger.error('Failed to check job completion status', {
        jobId: job.id,
        error,
      });
      return false;
    }
  }

  private async markJobAsCompletedInRedis(jobId: string): Promise<void> {
    const client = await this.getRedisClient();
    if (!client) return;
    try {
      if (typeof client.set === 'function') {
        await client.set(`job:completed:${jobId}`, 'true', 'EX', 86400); // 24h TTL
      }
    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err));
      this.logger.error('Failed to mark job as completed in Redis', {
        jobId,
        error,
      });
    }
  }

  private async recordAuditStart(
    job: Job<JobEnvelope<JobRegistry[K]>, void, K>,
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
          emitter: job.data.emitter,
          currentAttempt: job.attemptsMade + 1,
          startedAt,
        },
        ['jobId'],
      );
    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err));
      this.logger.error('Failed to record audit start', {
        jobId: job.id,
        error,
      });
    }
  }

  private async recordAuditSuccess(
    job: Job<JobEnvelope<JobRegistry[K]>, void, K>,
    result?: unknown,
  ): Promise<void> {
    if (job.id) {
      await this.markJobAsCompletedInRedis(job.id);
    }

    if (!this.auditRepo || !job.id) {
      return;
    }

    try {
      await this.auditRepo.updateWhere(
        { jobId: job.id },
        {
          status: JobAuditStatus.COMPLETED,
          finishedAt: new Date(),
          resultPayload: result ? (result as Record<string, unknown>) : undefined,
        },
      );
    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err));
      this.logger.error(
        'Failed to record audit success (swallowing to ensure job processing is marked as completed)',
        {
          jobId: job.id,
          error,
        },
      );
    }
  }

  private async recordAuditFailure(
    job: Job<JobEnvelope<JobRegistry[K]>, void, K>,
    error: Error | string,
  ): Promise<void> {
    if (!this.auditRepo || !job.id) {
      return;
    }

    try {
      const errorMessage = typeof error === 'string' ? error : error.message;
      const errorStack = typeof error === 'string' ? undefined : error.stack;

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
    } catch (err) {
      const auditError = err instanceof Error ? err : new Error(String(err));
      this.logger.error('Failed to record audit failure', {
        jobId: job.id,
        error: auditError,
      });
      throw typeof error === 'string' ? new Error(error) : error;
    }
  }
}
