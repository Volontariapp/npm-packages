import { BatchPostProcessor } from '../core/processors/batch.post-processor.js';
import type { PostProcessorOptions, BatchEventItem } from '../interfaces/index.js';
import type { EventEventMessagingType } from '@volontariapp/messaging';
import { CommonEventMessagingType } from '@volontariapp/messaging';
import { JobsOutboxRepository, EventQueueWriter, EventQueueRepository } from '@volontariapp/outbox';
import { EventQueueEntity, EventQueueModel, JobsOutboxModel } from '@volontariapp/database';
import { getEventForJob } from '@volontariapp/messaging';
import type { DataSource } from 'typeorm';
import type { Redis } from 'ioredis';
import { Streams } from '@volontariapp/shared';

export class JobOutboxSuccessPostProcessor extends BatchPostProcessor<CommonEventMessagingType.JOB_OUTBOX_SUCCESS> {
  private readonly outboxRepository: JobsOutboxRepository;
  private readonly db: DataSource;

  constructor(db: DataSource, redisDriver: Redis, options: PostProcessorOptions) {
    super(redisDriver, options);
    this.db = db;
    this.outboxRepository = new JobsOutboxRepository(db);
  }

  protected override shouldProcess(eventType: CommonEventMessagingType | string): boolean {
    return eventType === CommonEventMessagingType.JOB_OUTBOX_SUCCESS.toString();
  }

  protected async processEvents(
    events: BatchEventItem<CommonEventMessagingType.JOB_OUTBOX_SUCCESS>[],
  ): Promise<void> {
    await Promise.all(
      events.map(async ({ event, messageId }) => {
        const jobId = event.payload.after.job_id;
        const jobType = event.payload.after.job_type;

        this.logger.info(`Starting processing of JOB_OUTBOX_SUCCESS for job ${String(jobId)}`, {
          messageId,
          jobId,
        });

        if (!jobId) {
          this.logger.error('Received JOB_OUTBOX_SUCCESS but no job_id found in payload', {
            messageId,
          });
          return;
        }

        try {
          const exists = await this.outboxRepository.exists({ id: jobId });
          if (!exists) {
            this.logger.error(`Job with id ${jobId} does not exist in outbox`, {
              messageId,
              jobId,
            });
            return;
          }
          this.logger.info(`Job ${jobId} exists in outbox`, { messageId, jobId });

          const originalPayload = event.payload.after.result_payload?.originalPayload;

          if (!jobType || !originalPayload) {
            this.logger.warn(
              `Missing jobType or originalPayload for job ${jobId}. Skipping feedback event.`,
              {
                messageId,
                jobId,
                jobType,
                hasOriginalPayload: !!originalPayload,
              },
            );
          }

          await this.db.transaction(async (manager) => {
            this.logger.info(`Attempting to delete job ${jobId} from jobs_outbox`, {
              messageId,
              jobId,
            });
            const deleteResult = await manager.delete(JobsOutboxModel, { id: jobId });

            if (deleteResult.affected === 0) {
              this.logger.warn(`Race condition avoided: Job ${jobId} already deleted.`, {
                messageId,
                jobId,
              });
              return;
            }
            this.logger.info(`Successfully deleted job ${jobId} from jobs_outbox`, {
              messageId,
              jobId,
            });

            if (jobType && originalPayload) {
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
                  targetServices: [Streams.WS_JOBS_OUTBOX_SUCCESS],
                  payload: {
                    status: 'SUCCESS' as const,
                    // @ts-expect-error: JsonObject lacks strict interface index signatures
                    originalPayload,
                  },
                });
                await transactionalEventWriter.create(eventEntity);
                this.logger.info(
                  `Successfully created feedback event ${eventType} for job ${jobId}`,
                  { messageId, jobId, eventType },
                );
              } catch (mappingError) {
                this.logger.debug(`No feedback event emitted for job ${jobId} of type ${jobType}`, {
                  error: mappingError,
                });
              }
            }
          });
          this.logger.info(`Finished processing JOB_OUTBOX_SUCCESS for job ${jobId}`, {
            messageId,
            jobId,
          });
        } catch (error) {
          this.logger.error(`Failed to process JOB_OUTBOX_SUCCESS for job ${jobId}`, {
            messageId,
            jobId,
            error,
          });
          throw error;
        }
      }),
    );
  }
}
