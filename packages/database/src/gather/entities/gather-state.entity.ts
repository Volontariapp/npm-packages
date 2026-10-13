import { BaseEntity } from '../../core/base.entity.js';
import type { GatherEventState } from '../types/gather-event-state.interface.js';
import type { EventMessagingType, EventRegistry } from '@volontariapp/messaging';

export class GatherStateMetadata<TKey extends EventMessagingType = EventMessagingType> {
  emitterId?: string;
  traceId?: string;
  /**
   * W3C trace context of the trigger event, replayed on the completion event
   * (`''` = no trace context). Stored in the jsonb column. Required so the one
   * writer cannot forget it; rows stored before this field existed lack it at
   * runtime, so read it through `normalizeTraceparent`.
   */
  traceparent!: string;
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
