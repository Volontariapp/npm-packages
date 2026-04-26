import { JobsOutboxEntity, JobsOutboxModel, BaseOutboxConsumer } from '@volontariapp/database';

export class JobsOutboxConsumer extends BaseOutboxConsumer<JobsOutboxModel, JobsOutboxEntity> {}
