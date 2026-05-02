import { OutboxPusher, type JobsOutboxEntity } from '@volontariapp/database';
import type { Logger } from '@volontariapp/logger';

export class JobsOutboxPusher extends OutboxPusher<JobsOutboxEntity> {
  constructor(private readonly logger: Logger) {
    super();
  }

  pushElement(entity: JobsOutboxEntity): Promise<void> {
    this.logger.info(`Pushing job outbox item ${entity.id.toString()}`);
    // TODO: Implement pushing a single job
    return Promise.resolve();
  }

  pushBulkElement(entities: JobsOutboxEntity[]): Promise<void> {
    this.logger.info(`Pushing ${entities.length.toString()} job outbox items`);
    // TODO: Implement pushing multiple jobs
    return Promise.resolve();
  }
}
