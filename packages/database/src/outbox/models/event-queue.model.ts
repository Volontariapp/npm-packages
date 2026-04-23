import { OutboxModel } from './outbox.model.js';
import { Column, Entity } from 'typeorm';

@Entity('event_queue')
export class EventQueueModel extends OutboxModel {
  // Event metaadata
  @Column({ type: 'integer' })
  version!: number;

  // Data
  @Column({ type: 'jsonb' })
  payload!: {
    before?: any;
    after: any;
  };

  // Timestamps
  @Column({ name: 'processed_at', type: 'timestamp', nullable: true })
  processedAt?: Date;
}
