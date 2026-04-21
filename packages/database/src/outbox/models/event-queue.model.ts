import { OutboxModel } from './outbox.model.js';
import { Column, Entity } from 'typeorm';

@Entity('event_queue')
export class EventQueueModel extends OutboxModel {
  // Event metaadata
  @Column({ type: 'number' })
  version!: number;

  // Data
  @Column({ type: 'json' })
  payload!: {
    before?: any;
    after: any;
  };

  // Timestamps
  @Column({ name: 'processed_at', type: 'timestamp', nullable: true })
  processedAt?: Date;
}
