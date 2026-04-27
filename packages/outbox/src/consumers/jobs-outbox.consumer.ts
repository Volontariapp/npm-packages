import type { JobsOutboxEntity, JobsOutboxModel } from '@volontariapp/database';
import { OutboxConsumer } from '@volontariapp/database';

export class JobsOutboxConsumer extends OutboxConsumer<JobsOutboxModel, JobsOutboxEntity> {}
