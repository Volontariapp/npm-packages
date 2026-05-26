import { Queue, type JobsOptions } from 'bullmq';
import { OutboxPusher, type JobsOutboxEntity } from '@volontariapp/database';
import type { Logger } from '@volontariapp/logger';
import type { Redis } from 'ioredis';
import type { JobEnvelope } from '@volontariapp/messaging';

export class JobsOutboxPusher extends OutboxPusher<JobsOutboxEntity> {
  private readonly queues = new Map<string, Queue>();

  constructor(
    private readonly logger: Logger,
    private readonly redis: Redis,
  ) {
    super();
  }

  private getQueue(targetService: string): Queue {
    let queue = this.queues.get(targetService);
    if (!queue) {
      this.logger.debug(`Creating new BullMQ queue for service: ${targetService}`);
      queue = new Queue(targetService, {
        connection: this.redis,
        defaultJobOptions: {
          attempts: 3,
          backoff: {
            type: 'exponential',
            delay: 1000,
          },
          removeOnComplete: true,
        },
      });
      this.queues.set(targetService, queue);
    }
    return queue;
  }

  async pushElement(entity: JobsOutboxEntity): Promise<void> {
    this.logger.info(`Pushing job outbox item ${entity.id.toString()} to target: ${entity.target}`);

    try {
      const queue = this.getQueue(entity.target);
      const jobOptions: JobsOptions = {
        jobId: entity.id.toString(),
      };

      if (entity.scheduledAt) {
        const delay = entity.scheduledAt.getTime() - Date.now();
        if (delay > 0) {
          jobOptions.delay = delay;
        }
      }

      const envelope: JobEnvelope<typeof entity.payload> = {
        payload: entity.payload,
        emitter: entity.emitter,
        emitterId: entity.emitterId,
      };

      await queue.add(entity.type, envelope, jobOptions);
    } catch (error) {
      this.logger.error(`Failed to push job outbox item ${entity.id.toString()}`, { error });
      throw error;
    }
  }

  async pushBulkElement(entities: JobsOutboxEntity[]): Promise<void> {
    this.logger.info(`Pushing ${entities.length.toString()} job outbox items`);

    const targets = new Map<string, JobsOutboxEntity[]>();
    for (const entity of entities) {
      const targetEntities = targets.get(entity.target) ?? [];
      targetEntities.push(entity);
      targets.set(entity.target, targetEntities);
    }

    try {
      await Promise.all(
        Array.from(targets.entries()).map(async ([target, targetEntities]) => {
          const queue = this.getQueue(target);
          const jobs = targetEntities.map((entity) => {
            const jobOptions: JobsOptions = {
              jobId: entity.id.toString(),
            };

            if (entity.scheduledAt) {
              const delay = entity.scheduledAt.getTime() - Date.now();
              if (delay > 0) {
                jobOptions.delay = delay;
              }
            }

            return {
              name: entity.type,
              data: {
                payload: entity.payload,
                emitter: entity.emitter,
                emitterId: entity.emitterId,
              } as JobEnvelope<typeof entity.payload>,
              opts: jobOptions,
            };
          });

          await queue.addBulk(jobs);
        }),
      );
    } catch (error) {
      this.logger.error(`Failed to push bulk job outbox items`, { error });
      throw error;
    }
  }

  async close(): Promise<void> {
    this.logger.info('Closing all BullMQ queues');
    const closePromises = Array.from(this.queues.values()).map(async (q) => {
      try {
        await q.close();
      } catch (error) {
        this.logger.error(`Error closing queue ${q.name}`, { error });
      }
    });
    await Promise.all(closePromises);
    this.queues.clear();
  }
}
