import { Column, Entity, PrimaryColumn } from 'typeorm';
import { BaseModel } from '../../core/base.model.js';
import { GatherEventState } from '../types/gather-event-state.interface.js';
import { GatherStateMetadata } from '../entities/gather-state.entity.js';

@Entity('gather_state')
export class GatherStateModel extends BaseModel {
  @PrimaryColumn({ name: 'correlation_id', type: 'uuid' })
  correlationId!: string;

  @Column({ name: 'trigger_event', type: 'text' })
  triggerEvent!: string;

  @Column({ name: 'gather_events_state', type: 'jsonb', default: {} })
  gatherEventsState: Record<string, GatherEventState> = {};

  @Column({ type: 'jsonb', nullable: true })
  metadata?: GatherStateMetadata;
}
