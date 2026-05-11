import { WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@volontariapp/logger';
import { hostname } from 'node:os';
import type { Job } from 'bullmq';
import type { JobMessagingType, JobRegistry } from '@volontariapp/messaging';

export abstract class BaseWorker<K extends JobMessagingType> extends WorkerHost {
  protected readonly logger = new Logger({ context: this.constructor.name });
  protected readonly workerId: string = hostname();

  async process(job: Job<JobRegistry[K], void, K>, _token?: string): Promise<void> {
    this.logger.info('Processing job', {
      jobId: job.id,
      type: job.name,
      workerId: this.workerId,
    });

    try {
      await this.processJob(job);
      this.logger.info('Job completed', {
        jobId: job.id,
        type: job.name,
        workerId: this.workerId,
      });
    } catch (error: unknown) {
      this.logger.error('Job failed', {
        jobId: job.id,
        type: job.name,
        workerId: this.workerId,
        error,
      });
      throw error;
    }
  }

  protected abstract processJob(job: Job<JobRegistry[K], void, K>): Promise<void>;
}
