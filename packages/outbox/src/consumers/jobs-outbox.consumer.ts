import type { BaseRepository, JobsOutboxEntity, JobsOutboxModel } from '@volontariapp/database';
import { OutboxConsumer } from '@volontariapp/database';
import type { Logger } from '@volontariapp/logger';
import { JobsOutboxDispatcher } from '../dispatchers/jobs-outbox.dispatcher.js';

export class JobsOutboxConsumer extends OutboxConsumer<JobsOutboxModel, JobsOutboxEntity> {
  constructor(
    logger: Logger,
    repository: BaseRepository<JobsOutboxModel, JobsOutboxEntity, string>,
    batchSize: number,
  ) {
    super(logger, repository, batchSize, new JobsOutboxDispatcher(logger, repository));
  }
}
