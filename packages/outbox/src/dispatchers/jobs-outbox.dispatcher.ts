import {
  type JobsOutboxEntity,
  type JobsOutboxModel,
  type JobType,
  type JobPayload,
  OutboxDispatcher,
} from '@volontariapp/database';

export class JobsOutboxDispatcher<
  K extends JobType = JobType,
  P = JobPayload<K>,
> extends OutboxDispatcher<JobsOutboxModel, JobsOutboxEntity<K, P>> {}
