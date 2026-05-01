import type { EventQueueEntity, EventQueueModel, EventType } from '@volontariapp/database';
import { OutboxWriter } from '@volontariapp/database';

export class EventQueueWriter<K extends EventType = EventType> extends OutboxWriter<
  EventQueueModel,
  EventQueueEntity<K>
> {}
