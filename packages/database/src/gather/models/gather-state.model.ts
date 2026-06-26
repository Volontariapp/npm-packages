import { Column, Entity, Index } from 'typeorm';
import { BaseModel } from '../../core/base.model.js';

@Entity('gather_state')
export class GatherStateModel extends BaseModel {
  @Index('idx_gather_state_correlation_id')
  @Column({ name: 'correlation_id', type: 'uuid' })
  correlationId!: string;

  @Column({ name: 'trigger_event', type: 'text' })
  triggerEvent!: string;

  @Column({ name: 'expected_events', type: 'text', array: true })
  expectedEvents!: string[];

  @Column({ name: 'received_events', type: 'text', array: true, default: [] })
  receivedEvents: string[] = [];
}
