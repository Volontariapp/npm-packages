import type { EventPayload } from '../types/payload.registry.js';
import { OutboxModel } from './outbox.model.js';
import { Column, Entity } from 'typeorm';
import type { EventType } from '../types/event.type.js';

@Entity('event_queue')
export class EventQueueModel<K extends EventType = EventType> extends OutboxModel<K> {
  @Column({ type: 'integer' })
  version!: number;

  @Column({ type: 'jsonb' })
  payload!: {
    before?: EventPayload<K>;
    after: EventPayload<K>;
  };

  @Column({ name: 'processed_at', type: 'timestamp', nullable: true })
  processedAt?: Date;
}
