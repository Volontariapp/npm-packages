import type { EventQueueEntity, EventQueueModel } from '@volontariapp/database';
import { OutboxConsumer } from '@volontariapp/database';

export class EventQueueConsumer extends OutboxConsumer<EventQueueModel, EventQueueEntity> {}
