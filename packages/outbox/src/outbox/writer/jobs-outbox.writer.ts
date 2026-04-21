import { JobsOutboxEntity, JobsOutboxModel, OutboxWriter } from '@volontariapp/database';

export class JobsOutboxWriter extends OutboxWriter<JobsOutboxModel, JobsOutboxEntity> {}
