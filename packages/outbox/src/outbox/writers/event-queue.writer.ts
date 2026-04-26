import { EventQueueEntity, EventQueueModel, OutboxWriter } from '@volontariapp/database';

export class EventQueueWriter extends OutboxWriter<EventQueueModel, EventQueueEntity> {}
