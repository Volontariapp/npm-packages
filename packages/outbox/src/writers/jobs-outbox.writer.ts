import type { JobsOutboxEntity, JobsOutboxModel } from '@volontariapp/database';
import { OutboxWriter } from '@volontariapp/database';

export class JobsOutboxWriter extends OutboxWriter<JobsOutboxModel, JobsOutboxEntity> {}
