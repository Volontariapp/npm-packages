import { JobsOutboxEntity } from '../entities/jobs-outbox.entity.js';
import { JobsOutboxModel } from '../models/jobs-outbox.model.js';
import { OutboxWriter } from './outbox.writer.js';

export class JobsOutboxWriter extends OutboxWriter<JobsOutboxModel, JobsOutboxEntity> {}
