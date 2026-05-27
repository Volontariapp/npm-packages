import type { JobPayload } from '../types/payload.registry.js';
import { OutboxEntity } from './outbox.entity.js';
import { randomUUID } from 'crypto';
import type { JobType } from '../types/job.type.js';
import { OutboxStatus } from '../index.js';

export class JobsOutboxEntity<
  K extends JobType = JobType,
  P = JobPayload<K>,
> extends OutboxEntity<K> {
  target!: string;

  payload!: P;

  scheduledAt?: Date;

  static createJob<K extends JobType = JobType>(props: {
    type: K;
    emitter: string;
    emitterId: string;
    traceId?: string;
    target: string;
    payload: JobPayload<K>;
    scheduledAt?: Date;
  }): JobsOutboxEntity<K> {
    const entity = new JobsOutboxEntity<K>();
    entity.id = randomUUID();
    entity.type = props.type;
    entity.emitter = props.emitter;
    entity.emitterId = props.emitterId;
    entity.traceId = props.traceId;
    entity.target = props.target;
    entity.payload = props.payload;
    entity.scheduledAt = props.scheduledAt;
    entity.status = OutboxStatus.PENDING;
    entity.attempts = 0;
    entity.createdAt = new Date();
    entity.updatedAt = new Date();
    return entity;
  }
}
