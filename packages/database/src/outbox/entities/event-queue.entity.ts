import { OutboxEntity } from './outbox.entity.js';

export class EventQueueEntity extends OutboxEntity {
  // Event metaadata
  version!: number;

  // Data
  payload!: {
    before?: any;
    after: any;
  };

  // Timestamps
  processedAt?: Date;
}
