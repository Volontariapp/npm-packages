import { BaseEntity } from '../../core/base.entity.js';
import { ExpectedEventState } from '../types/expected-event-state.interface.js';

export class GatherStateEntity extends BaseEntity {
  correlationId!: string;
  triggerEvent!: string;
  eventsState: Record<string, ExpectedEventState> = {};
}
