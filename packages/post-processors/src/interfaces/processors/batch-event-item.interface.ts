import type { EventMessagingType, EventRegistry, StreamEvent } from '@volontariapp/messaging';
import type { ExtractPayload } from '../../types/post-processor.types.js';

export interface BatchEventItem<TKey extends EventMessagingType = EventMessagingType> {
  event: StreamEvent<ExtractPayload<EventRegistry[TKey]>>;
  messageId: string;
}
