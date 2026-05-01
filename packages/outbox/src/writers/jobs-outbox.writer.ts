import type { JobsOutboxEntity, JobsOutboxModel, JobType } from '@volontariapp/database';
import { OutboxWriter } from '@volontariapp/database';

export class JobsOutboxWriter<K extends JobType = JobType> extends OutboxWriter<
  JobsOutboxModel,
  JobsOutboxEntity<K>
> {}
