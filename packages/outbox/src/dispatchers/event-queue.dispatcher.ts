import {
  type EventQueueEntity,
  type EventQueueModel,
  OutboxDispatcher,
} from '@volontariapp/database';

export class EventQueueDispatcher extends OutboxDispatcher<EventQueueModel, EventQueueEntity> {}
