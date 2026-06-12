import { SinglePostProcessor } from '../core/processors/single.post-processor.js';
import type { PostProcessorOptions } from '../interfaces/index.js';
import type { EventEventMessagingType } from '@volontariapp/messaging';
import {
  CommonEventMessagingType,
  type IJobAuditPayload,
  type StreamEvent,
} from '@volontariapp/messaging';
import { JobsOutboxRepository, EventQueueWriter, EventQueueRepository } from '@volontariapp/outbox';
import { getEventForJob } from '@volontariapp/messaging';
import {
  EventQueueEntity,
  EventQueueModel,
  JobsOutboxModel,
  OutboxStatus,
} from '@volontariapp/database';
import type { DataSource } from 'typeorm';
import type { Redis } from 'ioredis';
import { Streams } from '@volontariapp/shared';

export class JobOutboxFailedPostProcessor extends SinglePostProcessor<CommonEventMessagingType.JOB_OUTBOX_FAILED> {
  private readonly outboxRepository: JobsOutboxRepository;
  private readonly db: DataSource;

  constructor(db: DataSource, redisDriver: Redis, options: PostProcessorOptions) {
    super(redisDriver, options);
    this.db = db;
    this.outboxRepository = new JobsOutboxRepository(db);
  }

  protected override shouldProcess(eventType: CommonEventMessagingType | string): boolean {
    return eventType === CommonEventMessagingType.JOB_OUTBOX_FAILED.toString();
  }

  protected async processEvent(
    event: StreamEvent<IJobAuditPayload>,
    messageId: string,
  ): Promise<void> {
    const jobId = event.payload.after.job_id;
    const jobType = event.payload.after.job_type;
    const errorMessage = event.payload.after.error_message;

    if (!jobId) {
      this.logger.error('Received JOB_OUTBOX_FAILED but no job_id found in payload', { messageId });
      return;
    }

    try {
      const entity = await this.outboxRepository.findById(jobId);
      if (!entity) {
        this.logger.error(`Job with id ${jobId} does not exist in outbox`, { messageId, jobId });
        return;
      }

      if (entity.status === OutboxStatus.FAILED) {
        this.logger.warn(
          `Job ${jobId} already marked as FAILED. Skipping to avoid duplicate events.`,
          { messageId, jobId },
        );
        return;
      }

      const originalPayload = entity.payload;

      if (!jobType) {
        this.logger.warn(`Missing jobType for job ${jobId}. Skipping feedback event.`, {
          messageId,
          jobId,
        });
      }

      await this.db.transaction(async (manager) => {
        const updateResult = await manager.update(
          JobsOutboxModel,
          { id: jobId, status: OutboxStatus.PENDING },
          { status: OutboxStatus.FAILED },
        );

        if (updateResult.affected === 0) {
          this.logger.warn(`Race condition avoided: Job ${jobId} already updated or deleted.`, {
            messageId,
            jobId,
          });
          return;
        }

        if (jobType) {
          try {
            const transactionalEventWriter = new EventQueueWriter<EventEventMessagingType>(
              this.logger,
              new EventQueueRepository(manager.getRepository(EventQueueModel)),
            );
            const eventType = getEventForJob(jobType);
            const eventEntity = EventQueueEntity.createEvent({
              type: eventType,
              emitter: 'ms-post-processors',
              emitterId: jobId,
              targetServices: [Streams.WS_JOBS_OUTBOX_FAILURE],
              payload: {
                status: 'FAILED' as const,
                // @ts-expect-error: JsonObject lacks strict interface index signatures
                originalPayload,
                error: errorMessage ?? undefined,
              },
            });
            await transactionalEventWriter.create(eventEntity);
          } catch (mappingError) {
            this.logger.debug(
              `No feedback event emitted for failed job ${jobId} of type ${jobType}`,
              {
                error: mappingError,
              },
            );
          }
        }
      });
    } catch (error) {
      this.logger.error(`Failed to process JOB_OUTBOX_FAILED for job ${jobId}`, {
        messageId,
        jobId,
        error,
      });
      throw error;
    }
  }
}
