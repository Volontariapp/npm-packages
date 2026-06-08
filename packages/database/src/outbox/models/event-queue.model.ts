import type { EventPayload } from '../types/payload.registry.js';
import { OutboxModel } from './outbox.model.js';
import { Column, Entity, Index } from 'typeorm';
import type { EventType } from '../types/event.type.js';
import { Streams } from '@volontariapp/shared';

@Entity('event_queue')
export class EventQueueModel<K extends EventType = EventType> extends OutboxModel<K> {
  @Column({ type: 'integer' })
  version!: number;

  @Index()
  @Column({ name: 'correlation_id', type: 'uuid', default: () => 'uuid_generate_v4()' })
  correlationId!: string;

  @Column({ name: 'target_services', type: 'varchar', array: true, default: [] })
  targetServices: Streams[] = [];

  @Column({ type: 'jsonb' })
  payload!: {
    before?: EventPayload<K>;
    after: EventPayload<K>;
  };

  @Column({ name: 'processed_at', type: 'timestamp', nullable: true })
  processedAt?: Date;
}
