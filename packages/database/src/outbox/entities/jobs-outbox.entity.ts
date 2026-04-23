import { OutboxEntity } from './outbox.entity.js';

export class JobsOutboxEntity extends OutboxEntity {
  target!: string;

  payload: any;

  scheduledAt?: Date;
}
