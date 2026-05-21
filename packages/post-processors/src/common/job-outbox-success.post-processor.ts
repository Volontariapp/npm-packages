import { SinglePostProcessor } from '../core/processors/single.post-processor.js';
import type { PostProcessorOptions } from '../interfaces/index.js';
import {
  CommonEventMessagingType,
  type IJobAuditPayload,
  type StreamEvent,
} from '@volontariapp/messaging';
import { JobsOutboxWriter, JobsOutboxRepository } from '@volontariapp/outbox';
import type { DataSource } from 'typeorm';
import type { Redis } from 'ioredis';

export class JobOutboxSuccessPostProcessor extends SinglePostProcessor<CommonEventMessagingType.JOB_OUTBOX_SUCCESS> {
  private readonly outboxWriter: JobsOutboxWriter;
  private readonly outboxRepository: JobsOutboxRepository;

  constructor(db: DataSource, redisDriver: Redis, options: PostProcessorOptions) {
    super(redisDriver, options);
    this.outboxRepository = new JobsOutboxRepository(db);
    this.outboxWriter = new JobsOutboxWriter(this.logger, this.outboxRepository);
  }

  protected override shouldProcess(eventType: CommonEventMessagingType | string): boolean {
    return eventType === CommonEventMessagingType.JOB_OUTBOX_SUCCESS.toString();
  }

  protected async processEvent(
    event: StreamEvent<IJobAuditPayload>,
    messageId: string,
  ): Promise<void> {
    const jobId = event.payload.after.job_id;
    if (!jobId) {
      this.logger.error('Received JOB_OUTBOX_SUCCESS but no job_id found in payload', {
        messageId,
      });
      return;
    }

    try {
      const exists = await this.outboxRepository.exists({ id: jobId });
      if (!exists) {
        this.logger.error(`Job with id ${jobId} does not exist in outbox`, { messageId, jobId });
        return;
      }

      await this.outboxWriter.delete(jobId);
    } catch (error) {
      this.logger.error(`Failed to process JOB_OUTBOX_SUCCESS for job ${jobId}`, {
        messageId,
        jobId,
        error,
      });
      throw error;
    }
  }
}
