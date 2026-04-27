import type { EventQueueEntity, EventQueueModel } from '@volontariapp/database';
import { OutboxWriter } from '@volontariapp/database';

export class EventQueueWriter extends OutboxWriter<EventQueueModel, EventQueueEntity> {}
