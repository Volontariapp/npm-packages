import {
  type EventQueueEntity,
  type EventQueueModel,
  type EventType,
  type EventPayload,
  OutboxDispatcher,
} from '@volontariapp/database';

export class EventQueueDispatcher<
  K extends EventType = EventType,
  P = EventPayload<K>,
> extends OutboxDispatcher<EventQueueModel, EventQueueEntity<K, P>> {}
