import type { EventPayload } from '../types/payload.registry.js';
import { OutboxEntity } from './outbox.entity.js';
import type { EventType } from '../types/event.type.js';

export class EventQueueEntity<
  K extends EventType = EventType,
  P = EventPayload<K>,
> extends OutboxEntity<K> {
  version!: number;

  payload!: {
    before?: P;
    after: P;
  };

  processedAt?: Date;
}
