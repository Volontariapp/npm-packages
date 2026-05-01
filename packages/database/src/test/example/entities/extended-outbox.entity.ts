import { OutboxEntity } from '../../../outbox/entities/outbox.entity.js';
import type { OutboxType } from '../../../outbox/types/outbox.type.js';

export class ExtendedOutboxEntity<T extends OutboxType = OutboxType> extends OutboxEntity<T> {
  channel: string = 'default';
}
