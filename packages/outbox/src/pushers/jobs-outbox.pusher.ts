import { OutboxPusher } from '@volontariapp/database';

export class JobsOutboxPusher extends OutboxPusher<JobsOutboxEntity> {}
