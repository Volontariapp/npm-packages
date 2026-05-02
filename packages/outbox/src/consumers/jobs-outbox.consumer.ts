import { OutboxConsumer } from '@volontariapp/database';
import type {
  JobsOutboxEntity,
  JobsOutboxModel,
  JobType,
  OutboxPusher,
} from '@volontariapp/database';
import type { Logger } from '@volontariapp/logger';
import { JobsOutboxDispatcher } from '../dispatchers/jobs-outbox.dispatcher.js';
import type { BaseRepository } from '@volontariapp/database';

export class JobsOutboxConsumer<K extends JobType = JobType> extends OutboxConsumer<
  JobsOutboxModel,
  JobsOutboxEntity<K>
> {
  constructor(
    logger: Logger,
    repository: BaseRepository<JobsOutboxModel, JobsOutboxEntity<K>, string>,
    batchSize: number,
    pusher: OutboxPusher<JobsOutboxEntity<K>>,
  ) {
    super(logger, repository, batchSize, new JobsOutboxDispatcher<K>(logger, repository), pusher);
  }
}
