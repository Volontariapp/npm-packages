import { OutboxEntity } from '../../../outbox/entities/outbox.entity.js';

export class ExtendedOutboxEntity extends OutboxEntity {
  channel: string = 'default';
}
