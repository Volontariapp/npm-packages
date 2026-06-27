import { Column, Entity, PrimaryColumn } from 'typeorm';
import { BaseModel } from '../../core/base.model.js';
import { ExpectedEventState } from '../types/expected-event-state.interface.js';

@Entity('gather_state')
export class GatherStateModel extends BaseModel {
  @PrimaryColumn({ name: 'correlation_id', type: 'uuid' })
  correlationId!: string;

  @Column({ name: 'trigger_event', type: 'text' })
  triggerEvent!: string;

  @Column({ type: 'jsonb', default: {} })
  eventsState: Record<string, ExpectedEventState> = {};
}
