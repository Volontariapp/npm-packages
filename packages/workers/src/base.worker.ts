import { Worker, type Job } from 'bullmq';
import { Logger } from '@volontariapp/logger';
import { hostname } from 'node:os';
import type { WorkerConfig } from './types/worker-config.types.js';

export abstract class BaseWorker<TData extends Record<string, unknown>> {
  private readonly worker: Worker<TData, void>;
  protected readonly logger: Logger;
  protected readonly workerId: string;

  constructor(protected readonly config: WorkerConfig) {
    this.workerId = hostname();
    this.logger = new Logger({ context: this.constructor.name });

    this.worker = new Worker<TData, void, string>(
      config.queueName,
      (job: Job<TData, void>) => this.processJob(job),
      {
        connection: config.connection,
        concurrency: config.concurrency ?? 1,
      },
    );

    this.registerEvents();
  }

  private registerEvents(): void {
    this.worker.on('completed', (job: Job<TData, void>) => {
      this.logger.info(`Job completed`, {
        jobId: job.id,
        jobName: job.name,
        workerId: this.workerId,
      });
    });

    this.worker.on('failed', (job: Job<TData, void> | undefined, error: Error) => {
      this.logger.error(`Job failed`, {
        jobId: job?.id,
        jobName: job?.name,
        workerId: this.workerId,
        error,
      });
    });

    this.worker.on('error', (error: Error) => {
      this.logger.error(`Worker error`, {
        workerId: this.workerId,
        queue: this.config.queueName,
        error,
      });
    });
  }

  protected abstract processJob(job: Job<TData, void>): Promise<void>;

  async close(): Promise<void> {
    this.logger.info(`Worker closing`, {
      workerId: this.workerId,
      queue: this.config.queueName,
    });
    await this.worker.close();
  }
}
