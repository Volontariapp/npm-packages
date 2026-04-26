import { EventQueueEntity, EventQueueModel, BaseOutboxConsumer } from '@volontariapp/database';

export class EventQueueConsumer extends BaseOutboxConsumer<EventQueueModel, EventQueueEntity> {}
