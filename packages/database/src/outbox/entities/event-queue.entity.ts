import type { EventPayload } from '../types/payload.registry.js';
import { OutboxEntity } from './outbox.entity.js';
import type { EventType } from '../types/event.type.js';
import type { Streams } from '@volontariapp/shared';

export class EventQueueEntity<
  K extends EventType = EventType,
  P = EventPayload<K>,
> extends OutboxEntity<K> {
  version!: number;

  targetServices: Streams[] = [];

  payload!: {
    before?: P;
    after: P;
  };

  processedAt?: Date;
}
