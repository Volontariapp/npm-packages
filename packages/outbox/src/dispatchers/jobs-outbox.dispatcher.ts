import {
  type JobsOutboxEntity,
  type JobsOutboxModel,
  OutboxDispatcher,
} from '@volontariapp/database';

export class JobsOutboxDispatcher extends OutboxDispatcher<JobsOutboxModel, JobsOutboxEntity> {}
