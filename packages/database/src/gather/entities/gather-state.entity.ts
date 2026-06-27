import { BaseEntity } from '../../core/base.entity.js';
import { GatherEventState } from '../types/gather-event-state.interface.js';
import type { EventMessagingType, EventRegistry } from '@volontariapp/messaging';

export class GatherStateMetadata<TKey extends EventMessagingType = EventMessagingType> {
  emitterId?: string;
  traceId?: string;
  payload?: EventRegistry[TKey];
}

export class GatherStateEntity<
  TKey extends EventMessagingType = EventMessagingType,
> extends BaseEntity {
  correlationId!: string;
  triggerEvent!: TKey;
  gatherEventsState: Record<string, GatherEventState> = {};
  metadata?: GatherStateMetadata<TKey>;
}
